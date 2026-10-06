import { Router } from "express";
import { z } from "zod";
import { prisma } from "../db/prisma";
import { requireAuth } from "../auth/middleware";
import { toOrderPublic, toProductPublic, toUserPublic } from "../lib/serialize";
import { renderInvoicePdf } from "../services/orders";
import { hashPassword, verifyPassword } from "../auth/password";
import { issueRefreshToken, revokeAllSessions, signAccessToken } from "../auth/tokens";
import { setAuthCookies } from "../auth/cookies";
import { isShopAvailable } from "../tenant/tenantContext";

export const buyerRouter = Router();
export const ordersRouter = Router();

buyerRouter.use(requireAuth);

const orderInclude = {
  items: {
    include: {
      product: { select: { id: true, title: true, images: true } },
    },
  },
  tenant: {
    select: { id: true, name: true, slug: true, verifiedBadge: true },
  },
} as const;

buyerRouter.get("/me", async (req, res, next) => {
  try {
    return res.json({ user: toUserPublic(req.user!) });
  } catch (err) {
    return next(err);
  }
});

buyerRouter.patch("/me", async (req, res, next) => {
  try {
    const body = z
      .object({
        name: z.string().min(1).max(120).nullable().optional(),
        phone: z.string().min(5).max(32).nullable().optional(),
        whatsappNumber: z.string().min(5).max(32).nullable().optional(),
        notificationPrefs: z
          .object({
            orderEmails: z.boolean().optional(),
            whatsappOrders: z.boolean().optional(),
          })
          .optional(),
      })
      .parse(req.body);

    const currentPrefs =
      (req.user!.notificationPrefs as {
        orderEmails?: boolean;
        whatsappOrders?: boolean;
      } | null) ?? {};

    const user = await prisma.user.update({
      where: { id: req.user!.id },
      data: {
        ...(body.name !== undefined ? { name: body.name } : {}),
        ...(body.phone !== undefined ? { phone: body.phone } : {}),
        ...(body.whatsappNumber !== undefined
          ? { whatsappNumber: body.whatsappNumber }
          : {}),
        ...(body.notificationPrefs
          ? {
              notificationPrefs: {
                orderEmails:
                  body.notificationPrefs.orderEmails ??
                  currentPrefs.orderEmails !== false,
                // WhatsApp notifications stubbed until integration ships
                whatsappOrders: false,
              },
            }
          : {}),
      },
    });
    return res.json({ user: toUserPublic(user) });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res
        .status(400)
        .json({ error: "Validation failed", details: err.flatten() });
    }
    return next(err);
  }
});

buyerRouter.post("/me/password", async (req, res, next) => {
  try {
    const body = z
      .object({
        currentPassword: z.string().min(1),
        newPassword: z.string().min(8).max(128),
      })
      .parse(req.body);

    const user = await prisma.user.findUnique({ where: { id: req.user!.id } });
    if (!user?.passwordHash) {
      return res.status(400).json({
        error:
          "This account uses Google sign-in and has no password to change",
      });
    }

    const ok = await verifyPassword(user.passwordHash, body.currentPassword);
    if (!ok) {
      return res.status(400).json({ error: "Current password is incorrect" });
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash: await hashPassword(body.newPassword) },
    });
    // Sign out every other device, then keep this one signed in.
    await revokeAllSessions(user.id);
    setAuthCookies(
      res,
      signAccessToken({ sub: user.id, email: user.email, role: user.role }),
      await issueRefreshToken(user.id)
    );
    return res.json({ ok: true });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res
        .status(400)
        .json({ error: "Validation failed", details: err.flatten() });
    }
    return next(err);
  }
});

buyerRouter.get("/orders", async (req, res, next) => {
  try {
    const orders = await prisma.order.findMany({
      where: { buyerId: req.user!.id },
      include: orderInclude,
      orderBy: { createdAt: "desc" },
    });
    return res.json({ orders: orders.map(toOrderPublic) });
  } catch (err) {
    return next(err);
  }
});

buyerRouter.get("/orders/:id", async (req, res, next) => {
  try {
    const order = await prisma.order.findFirst({
      where: { id: req.params.id, buyerId: req.user!.id },
      include: orderInclude,
    });
    if (!order) {
      return res.status(404).json({ error: "Order not found" });
    }
    const shop = await prisma.tenant.findUnique({
      where: { id: order.tenantId },
      select: {
        status: true,
        email: true,
        phone: true,
        themeSettings: true,
        owner: { select: { email: true } },
      },
    });
    const theme = (shop?.themeSettings as { whatsappUrl?: unknown } | null) ?? {};
    return res.json({
      order: toOrderPublic(order),
      /** Buyers can reach the seller even when the storefront is unavailable. */
      shopContact: shop
        ? {
            available: isShopAvailable(shop.status),
            email: shop.email || shop.owner.email,
            phone: shop.phone,
            whatsappUrl: typeof theme.whatsappUrl === "string" ? theme.whatsappUrl : null,
          }
        : null,
    });
  } catch (err) {
    return next(err);
  }
});

buyerRouter.get("/favorites", async (req, res, next) => {
  try {
    const favorites = await prisma.favorite.findMany({
      where: { userId: req.user!.id },
      include: {
        product: {
          include: {
            category: true,
            brand: true,
            tenant: { select: { id: true, name: true, slug: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });
    return res.json({
      favorites: favorites.map((f) => ({
        id: f.id,
        product: toProductPublic(f.product),
      })),
    });
  } catch (err) {
    return next(err);
  }
});

buyerRouter.post("/favorites/:productId", async (req, res, next) => {
  try {
    const product = await prisma.product.findFirst({
      where: { id: req.params.productId, status: "active" },
    });
    if (!product) {
      return res.status(404).json({ error: "Product not found" });
    }
    const fav = await prisma.favorite.upsert({
      where: {
        userId_productId: {
          userId: req.user!.id,
          productId: product.id,
        },
      },
      create: { userId: req.user!.id, productId: product.id },
      update: {},
      include: {
        product: {
          include: {
            category: true,
            brand: true,
            tenant: { select: { id: true, name: true, slug: true } },
          },
        },
      },
    });
    return res.status(201).json({
      favorite: { id: fav.id, product: toProductPublic(fav.product) },
    });
  } catch (err) {
    return next(err);
  }
});

buyerRouter.delete("/favorites/:productId", async (req, res, next) => {
  try {
    await prisma.favorite.deleteMany({
      where: { userId: req.user!.id, productId: req.params.productId },
    });
    return res.json({ ok: true });
  } catch (err) {
    return next(err);
  }
});

ordersRouter.get("/:id/invoice", requireAuth, async (req, res, next) => {
  try {
    const order = await prisma.order.findUnique({
      where: { id: req.params.id },
    });
    if (!order) {
      return res.status(404).json({ error: "Order not found" });
    }

    const isBuyer = order.buyerId === req.user!.id;
    const membership = await prisma.tenantAdmin.findFirst({
      where: { tenantId: order.tenantId, userId: req.user!.id },
    });
    if (!isBuyer && !membership && req.user!.role !== "super_admin") {
      return res.status(403).json({ error: "Not allowed to download this invoice" });
    }

    if (order.status !== "paid" && order.status !== "fulfilled") {
      return res.status(404).json({ error: "Invoice not ready yet" });
    }
    const pdf = await renderInvoicePdf(order.id);
    if (!pdf) return res.status(404).json({ error: "Order not found" });

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Length", String(pdf.length));
    res.setHeader("Content-Disposition", `attachment; filename="invoice-${order.id}.pdf"`);
    res.setHeader("Cache-Control", "private, no-store");
    res.setHeader("X-Content-Type-Options", "nosniff");
    return res.end(pdf);
  } catch (err) {
    return next(err);
  }
});
