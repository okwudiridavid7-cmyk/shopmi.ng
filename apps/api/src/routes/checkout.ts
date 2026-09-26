import { Router } from "express";
import { prisma } from "../db/prisma";
import { env } from "../config/env";
import { requireAuth } from "../auth/middleware";
import { requireTenantFromSlugParam } from "../tenant/middleware";
import { decimalToNumber, toOrderPublic } from "../lib/serialize";
import { fulfillPaidOrder } from "../services/orders";
import { getCommissionPercent, getPlatformSetting } from "../lib/platformSettings";
import { ensurePaystackSubaccount } from "../services/paystackSubaccount";

export const checkoutRouter = Router();

checkoutRouter.post(
  "/:slug/initialize",
  requireAuth,
  requireTenantFromSlugParam("slug"),
  async (req, res, next) => {
    try {
      if (!env.paystackSecretKey) {
        return res.status(503).json({
          error: "Paystack is not configured. Set PAYSTACK_SECRET_KEY in .env",
        });
      }

      const emailVerificationRequired =
        (await getPlatformSetting("email_verification_required", "false")) ===
        "true";
      if (emailVerificationRequired) {
        const buyer = await prisma.user.findUnique({
          where: { id: req.user!.id },
          select: { emailVerifiedAt: true },
        });
        if (!buyer?.emailVerifiedAt) {
          return res.status(403).json({
            error:
              "Verify your email before checkout. Check your inbox or resend from account settings.",
            code: "EMAIL_UNVERIFIED",
          });
        }
      }

      const tenant = await prisma.tenant.findUnique({
        where: { id: req.tenant!.tenantId },
      });
      if (!tenant || tenant.status === "suspended") {
        return res.status(404).json({ error: "Shop not found" });
      }

      const verificationRequired = await prisma.platformSetting.findUnique({
        where: { key: "verification_required" },
      });
      if (
        verificationRequired?.value === "true" &&
        !tenant.verifiedBadge
      ) {
        return res.status(403).json({
          error:
            "This shop must be verified before accepting payments. Ask the seller to complete verification.",
        });
      }

      const cart = await prisma.cart.findUnique({
        where: {
          tenantId_userId: {
            tenantId: req.tenant!.tenantId,
            userId: req.user!.id,
          },
        },
        include: {
          items: { include: { product: true } },
        },
      });

      if (!cart || cart.items.length === 0) {
        return res.status(400).json({ error: "Cart is empty" });
      }

      for (const item of cart.items) {
        if (item.product.status !== "active") {
          return res.status(400).json({
            error: `Product ${item.product.title} is not available`,
          });
        }
        if (item.product.stockQty < item.qty) {
          return res.status(400).json({
            error: `Insufficient stock for ${item.product.title}`,
          });
        }
        // Defense: product must belong to resolved tenant
        if (item.product.tenantId !== req.tenant!.tenantId) {
          return res.status(403).json({ error: "Cart contains invalid items" });
        }
      }

      const currency = cart.items[0]!.product.currency;
      const subtotal = cart.items.reduce(
        (sum, item) => sum + decimalToNumber(item.product.price) * item.qty,
        0
      );

      const reference = `ord_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;

      const order = await prisma.order.create({
        data: {
          tenantId: req.tenant!.tenantId,
          buyerId: req.user!.id,
          status: "pending_payment",
          subtotal,
          total: subtotal,
          currency,
          paystackReference: reference,
          items: {
            create: cart.items.map((item) => ({
              productId: item.productId,
              qty: item.qty,
              unitPrice: item.product.price,
            })),
          },
        },
        include: {
          items: { include: { product: { select: { id: true, title: true, images: true } } } },
          tenant: { select: { id: true, name: true, slug: true, verifiedBadge: true } },
        },
      });

      // Paystack amounts are in kobo (smallest currency unit) for NGN
      const amountKobo = Math.round(subtotal * 100);
      const callbackUrl = `${env.webUrl}/checkout/callback?reference=${reference}&shop=${req.tenant!.slug}`;

      const commissionPercent = await getCommissionPercent(5);
      const serviceFeeKobo = Math.max(
        0,
        Math.round(amountKobo * (commissionPercent / 100))
      );

      // Verified sellers: ensure/use Paystack subaccount + Shopmi Service Fee split.
      // See apps/api/docs/PAYSTACK_SPLITS.md
      let subaccountCode: string | null = tenant.paystackSubaccountCode;
      if (tenant.verifiedBadge && !subaccountCode) {
        subaccountCode = await ensurePaystackSubaccount(tenant.id);
      }

      const customFields: {
        display_name: string;
        variable_name: string;
        value: string;
      }[] = [
        {
          display_name: "Order ID",
          variable_name: "order_id",
          value: order.id,
        },
      ];

      const initPayload: Record<string, unknown> = {
        email: req.user!.email,
        amount: amountKobo,
        currency,
        reference,
        callback_url: callbackUrl,
        metadata: {
          orderId: order.id,
          tenantId: req.tenant!.tenantId,
          shopmi_service_fee_kobo: serviceFeeKobo,
          commission_percent: commissionPercent,
          custom_fields: customFields,
        },
      };

      if (tenant.verifiedBadge && subaccountCode && serviceFeeKobo > 0) {
        customFields.push({
          display_name: "Shopmi Service Fee",
          variable_name: "shopmi_service_fee",
          value: `₦${(serviceFeeKobo / 100).toLocaleString("en-NG", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })} (${commissionPercent}%)`,
        });
        initPayload.subaccount = subaccountCode;
        // Flat fee (kobo) settled to main Paystack balance as Shopmi Service Fee;
        // seller subaccount gets the remainder.
        initPayload.transaction_charge = serviceFeeKobo;
        initPayload.bearer = "account";
      }

      const paystackRes = await fetch(
        "https://api.paystack.co/transaction/initialize",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${env.paystackSecretKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(initPayload),
        }
      );

      const paystackJson = (await paystackRes.json()) as {
        status: boolean;
        message: string;
        data?: { authorization_url: string; access_code: string; reference: string };
      };

      if (!paystackRes.ok || !paystackJson.status || !paystackJson.data) {
        await prisma.order.update({
          where: { id: order.id },
          data: { status: "failed" },
        });
        return res.status(502).json({
          error: paystackJson.message || "Paystack initialize failed",
        });
      }

      return res.json({
        order: toOrderPublic(order),
        authorizationUrl: paystackJson.data.authorization_url,
        reference: paystackJson.data.reference,
        publicKey: env.paystackPublicKey,
      });
    } catch (err) {
      return next(err);
    }
  }
);

/** Optional server-side verify after Paystack redirect (webhook remains source of truth). */
checkoutRouter.get(
  "/verify/:reference",
  requireAuth,
  async (req, res, next) => {
    try {
      const reference = req.params.reference;
      let order = await prisma.order.findFirst({
        where: { paystackReference: reference, buyerId: req.user!.id },
        include: {
          items: { include: { product: { select: { id: true, title: true, images: true } } } },
          tenant: { select: { id: true, name: true, slug: true, verifiedBadge: true } },
        },
      });
      if (!order) {
        return res.status(404).json({ error: "Order not found" });
      }

      if (order.status === "pending_payment" && env.paystackSecretKey) {
        const verifyRes = await fetch(
          `https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`,
          {
            headers: { Authorization: `Bearer ${env.paystackSecretKey}` },
          }
        );
        const verifyJson = (await verifyRes.json()) as {
          status: boolean;
          data?: { status: string; reference: string };
        };
        if (verifyJson.status && verifyJson.data?.status === "success") {
          await fulfillPaidOrder(reference);
          order = await prisma.order.findUniqueOrThrow({
            where: { id: order.id },
            include: {
              items: {
                include: { product: { select: { id: true, title: true, images: true } } },
              },
              tenant: { select: { id: true, name: true, slug: true, verifiedBadge: true } },
            },
          });
        }
      }

      return res.json({ order: toOrderPublic(order) });
    } catch (err) {
      return next(err);
    }
  }
);
