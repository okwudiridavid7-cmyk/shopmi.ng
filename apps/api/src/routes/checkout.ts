import { Router } from "express";
import { prisma } from "../db/prisma";
import { env } from "../config/env";
import { requireAuth } from "../auth/middleware";
import { requireTenantFromSlugParam } from "../tenant/middleware";
import { decimalToNumber, toOrderPublic } from "../lib/serialize";
import { applyOrderCharge } from "../services/orders";
import { getCommissionPercent, getPlatformSetting } from "../lib/platformSettings";
import { ensurePaystackSubaccount } from "../services/paystackSubaccount";
import { isShopAvailable } from "../tenant/tenantContext";
import { redisRateLimit } from "../lib/rateLimit";
import {
  PaystackError,
  initializeTransaction,
  newReference,
  paystackConfigured,
  toMinorUnits,
  verifyTransaction,
} from "../services/paystack";

export const checkoutRouter = Router();

const checkoutLimiter = redisRateLimit({
  name: "checkout",
  windowMs: 10 * 60 * 1000,
  max: 20,
  by: "user",
  message: "Too many checkout attempts. Please wait a few minutes.",
});

const verifyLimiter = redisRateLimit({
  name: "checkout-verify",
  windowMs: 60 * 1000,
  max: 30,
  by: "user",
});

checkoutRouter.post(
  "/:slug/initialize",
  requireAuth,
  checkoutLimiter,
  requireTenantFromSlugParam("slug"),
  async (req, res, next) => {
    try {
      if (!paystackConfigured()) {
        return res.status(503).json({ error: "Payments are not available right now" });
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
      if (!tenant || !isShopAvailable(tenant.status)) {
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
      if (cart.items.some((item) => item.product.currency !== currency)) {
        return res.status(400).json({
          error: "Items in this cart use different currencies. Check out one currency at a time.",
        });
      }
      const subtotal =
        Math.round(
          cart.items.reduce(
            (sum, item) => sum + decimalToNumber(item.product.price) * item.qty,
            0
          ) * 100
        ) / 100;
      if (subtotal <= 0) {
        return res.status(400).json({ error: "Cart total must be above zero" });
      }

      const commissionPercent = await getCommissionPercent(5);
      const amountKobo = toMinorUnits(subtotal);
      const serviceFeeKobo = Math.max(0, Math.round(amountKobo * (commissionPercent / 100)));

      // Verified sellers: ensure/use Paystack subaccount + Shopmi Service Fee split.
      // See apps/api/docs/PAYSTACK_SPLITS.md
      let subaccountCode: string | null = tenant.paystackSubaccountCode;
      if (tenant.verifiedBadge && !subaccountCode) {
        subaccountCode = await ensurePaystackSubaccount(tenant.id);
      }
      const splits = Boolean(tenant.verifiedBadge && subaccountCode && serviceFeeKobo > 0);

      const reference = newReference("ord_");

      const order = await prisma.order.create({
        data: {
          tenantId: req.tenant!.tenantId,
          buyerId: req.user!.id,
          status: "pending_payment",
          subtotal,
          total: subtotal,
          currency,
          paystackReference: reference,
          splitSubaccount: splits ? subaccountCode : null,
          serviceFee: serviceFeeKobo / 100,
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

      const callbackUrl = `${env.webUrl}/checkout/callback?reference=${reference}&shop=${encodeURIComponent(req.tenant!.slug)}`;

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

      if (splits) {
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

      let init: Awaited<ReturnType<typeof initializeTransaction>>;
      try {
        init = await initializeTransaction(initPayload);
      } catch (err) {
        await prisma.order.update({
          where: { id: order.id },
          data: { status: "failed", failureReason: "init_failed" },
        });
        console.error("[checkout] Paystack initialize failed:", err instanceof Error ? err.message : err);
        return res.status(502).json({ error: "Could not start payment. Please try again." });
      }

      return res.json({
        order: toOrderPublic(order),
        authorizationUrl: init.authorization_url,
        reference: init.reference,
        publicKey: env.paystackPublicKey,
      });
    } catch (err) {
      return next(err);
    }
  }
);

/** Callback page check. The webhook is the source of truth; this only speeds things up. */
checkoutRouter.get("/verify/:reference", requireAuth, verifyLimiter, async (req, res, next) => {
  try {
    const reference = req.params.reference;
    const include = {
      items: { include: { product: { select: { id: true, title: true, images: true } } } },
      tenant: { select: { id: true, name: true, slug: true, verifiedBadge: true } },
    } as const;
    const where = { paystackReference: reference, buyerId: req.user!.id };
    let order = await prisma.order.findFirst({ where, include });
    if (!order) {
      return res.status(404).json({ error: "Order not found" });
    }

    if ((order.status === "pending_payment" || order.status === "failed") && paystackConfigured()) {
      try {
        const charge = await verifyTransaction(reference);
        if (charge?.status === "success") {
          await applyOrderCharge(charge);
          order = await prisma.order.findFirstOrThrow({ where, include });
        }
      } catch (err) {
        if (!(err instanceof PaystackError)) throw err;
      }
    }

    return res.json({ order: toOrderPublic(order) });
  } catch (err) {
    return next(err);
  }
});
