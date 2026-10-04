import { Router } from "express";
import { z } from "zod";
import { prisma } from "../db/prisma";
import { optionalAuth } from "../auth/middleware";
import { requireTenantFromSlugParam } from "../tenant/middleware";
import type { TenantStatus } from "@prisma/client";
import { isShopAvailable, tenantWhere } from "../tenant/tenantContext";
import { toProductPublic } from "../lib/serialize";
import { getOrSetCartSessionId } from "../lib/cartSession";
import { mergeGuestCarts } from "../services/cartMerge";

export const cartsRouter = Router();

type CartOwner =
  | { kind: "user"; userId: string }
  | { kind: "session"; sessionId: string };

function ownerFromReq(
  req: Parameters<typeof getOrSetCartSessionId>[0],
  res: Parameters<typeof getOrSetCartSessionId>[1]
): CartOwner {
  if (req.user?.id) {
    return { kind: "user", userId: req.user.id };
  }
  return { kind: "session", sessionId: getOrSetCartSessionId(req, res) };
}

async function getOrCreateCart(owner: CartOwner, tenantId: string) {
  if (owner.kind === "user") {
    return prisma.cart.upsert({
      where: {
        tenantId_userId: { tenantId, userId: owner.userId },
      },
      create: { tenantId, userId: owner.userId, sessionId: null },
      update: {},
    });
  }
  const existing = await prisma.cart.findUnique({
    where: {
      tenantId_sessionId: { tenantId, sessionId: owner.sessionId },
    },
  });
  if (existing) return existing;
  return prisma.cart.create({
    data: {
      tenantId,
      sessionId: owner.sessionId,
      userId: null,
    },
  });
}

async function findCart(owner: CartOwner, tenantId: string) {
  if (owner.kind === "user") {
    return prisma.cart.findUnique({
      where: { tenantId_userId: { tenantId, userId: owner.userId } },
    });
  }
  return prisma.cart.findUnique({
    where: {
      tenantId_sessionId: { tenantId, sessionId: owner.sessionId },
    },
  });
}

async function serializeCart(
  cart: {
    id: string;
    tenantId: string;
    items: {
      id: string;
      productId: string;
      qty: number;
      product: Parameters<typeof toProductPublic>[0];
    }[];
    tenant?: { name: string; slug: string; status?: TenantStatus } | null;
  } | null,
  tenantId: string,
  meta?: { shopSlug?: string; shopName?: string }
) {
  if (!cart) {
    return {
      id: null,
      tenantId,
      shopSlug: meta?.shopSlug,
      shopName: meta?.shopName,
      items: [],
      subtotal: 0,
      currency: "NGN",
      available: true,
    };
  }
  const items = cart.items.map((item) => ({
    id: item.id,
    productId: item.productId,
    qty: item.qty,
    product: toProductPublic(item.product),
  }));
  const subtotal = items.reduce(
    (sum, item) => sum + item.product.price * item.qty,
    0
  );
  return {
    id: cart.id,
    tenantId,
    shopSlug: meta?.shopSlug ?? cart.tenant?.slug,
    shopName: meta?.shopName ?? cart.tenant?.name,
    items,
    subtotal,
    currency: items[0]?.product.currency ?? "NGN",
    /** False when the shop is hidden; its items can be removed but not bought. */
    available: cart.tenant?.status ? isShopAvailable(cart.tenant.status) : true,
  };
}

const cartInclude = {
  items: {
    include: {
      product: {
        include: {
          category: true,
          brand: true,
          tenant: { select: { id: true, name: true, slug: true } },
        },
      },
    },
  },
  tenant: { select: { name: true, slug: true, status: true } },
} as const;

async function loadCart(owner: CartOwner, tenantId: string) {
  const cart = await findCart(owner, tenantId);
  if (!cart) return serializeCart(null, tenantId);
  const full = await prisma.cart.findUnique({
    where: { id: cart.id },
    include: cartInclude,
  });
  return serializeCart(full, tenantId);
}

/** Aggregate all carts for badge count (guest session or logged-in user). */
cartsRouter.get("/", optionalAuth, async (req, res, next) => {
  try {
    const owner = ownerFromReq(req, res);
    const where =
      owner.kind === "user"
        ? { userId: owner.userId }
        : { sessionId: owner.sessionId };
    const carts = await prisma.cart.findMany({
      where,
      include: cartInclude,
    });
    const serialized = await Promise.all(
      carts.map((c) => serializeCart(c, c.tenantId))
    );
    const withItems = serialized.filter((c) => c.items.length > 0);
    const itemCount = withItems.reduce(
      (n, c) => n + c.items.reduce((s, i) => s + i.qty, 0),
      0
    );
    return res.json({ summary: { itemCount, carts: withItems } });
  } catch (err) {
    return next(err);
  }
});

/**
 * Merge guest session carts into the authenticated user's carts.
 * Also invoked automatically from auth login/signup.
 */
cartsRouter.post("/merge", optionalAuth, async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: "Authentication required" });
    }
    const sessionId = req.cookies?.cart_session as string | undefined;
    const merged = await mergeGuestCarts(req.user.id, sessionId);
    return res.json({ merged });
  } catch (err) {
    return next(err);
  }
});

/** Removing items works even when the shop is unavailable, so carts never get stuck. */
cartsRouter.delete("/:slug/items/:itemId", optionalAuth, async (req, res, next) => {
  try {
    const tenant = await prisma.tenant.findUnique({
      where: { slug: req.params.slug.toLowerCase() },
      select: { id: true },
    });
    if (!tenant) return res.status(404).json({ error: "Shop not found" });
    const owner = ownerFromReq(req, res);
    const cart = await findCart(owner, tenant.id);
    if (!cart) {
      return res.status(404).json({ error: "Cart not found" });
    }
    await prisma.cartItem.deleteMany({
      where: { id: req.params.itemId, cartId: cart.id },
    });
    return res.json({ cart: await loadCart(owner, tenant.id) });
  } catch (err) {
    return next(err);
  }
});

cartsRouter.use(
  "/:slug",
  optionalAuth,
  requireTenantFromSlugParam("slug")
);

cartsRouter.get("/:slug", async (req, res, next) => {
  try {
    const owner = ownerFromReq(req, res);
    const tenant = await prisma.tenant.findUnique({
      where: { id: req.tenant!.tenantId },
    });
    const cart = await loadCart(owner, req.tenant!.tenantId);
    return res.json({
      cart: {
        ...cart,
        shopSlug: tenant?.slug,
        shopName: tenant?.name,
      },
    });
  } catch (err) {
    return next(err);
  }
});

const addSchema = z.object({
  productId: z.string().min(1),
  qty: z.coerce.number().int().min(1).max(99).default(1),
});

cartsRouter.post("/:slug/items", async (req, res, next) => {
  try {
    const body = addSchema.parse(req.body);
    const owner = ownerFromReq(req, res);
    const product = await prisma.product.findFirst({
      where: tenantWhere(req.tenant!, {
        id: body.productId,
        status: "active" as const,
      }),
    });
    if (!product) {
      return res.status(404).json({ error: "Product not found in this shop" });
    }
    if (product.stockQty < body.qty) {
      return res.status(400).json({ error: "Insufficient stock" });
    }

    const cart = await getOrCreateCart(owner, req.tenant!.tenantId);
    await prisma.cartItem.upsert({
      where: {
        cartId_productId: { cartId: cart.id, productId: product.id },
      },
      create: { cartId: cart.id, productId: product.id, qty: body.qty },
      update: { qty: { increment: body.qty } },
    });

    const updated = await loadCart(owner, req.tenant!.tenantId);
    return res.status(201).json({ cart: updated });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res
        .status(400)
        .json({ error: "Validation failed", details: err.flatten() });
    }
    return next(err);
  }
});

const importSchema = z.object({
  items: z
    .array(
      z.object({
        productId: z.string().min(1),
        qty: z.coerce.number().int().min(1).max(99),
      })
    )
    .min(1)
    .max(50),
});

/**
 * Cart handoff from a seller's custom domain. Sets quantities (not increments),
 * so reopening the same handoff link doesn't double the cart.
 */
cartsRouter.post("/:slug/import", async (req, res, next) => {
  try {
    const body = importSchema.parse(req.body);
    const owner = ownerFromReq(req, res);
    const tenantId = req.tenant!.tenantId;
    const ids = [...new Set(body.items.map((i) => i.productId))];
    const products = await prisma.product.findMany({
      where: tenantWhere(req.tenant!, { id: { in: ids }, status: "active" as const }),
      select: { id: true, title: true, stockQty: true },
    });
    const byId = new Map(products.map((p) => [p.id, p]));

    const cart = await getOrCreateCart(owner, tenantId);
    const skipped: { productId: string; title?: string; reason: string }[] = [];
    for (const item of body.items) {
      const product = byId.get(item.productId);
      if (!product) {
        skipped.push({ productId: item.productId, reason: "No longer available" });
        continue;
      }
      if (product.stockQty < 1) {
        skipped.push({ productId: product.id, title: product.title, reason: "Out of stock" });
        continue;
      }
      const qty = Math.min(item.qty, product.stockQty);
      if (qty < item.qty) {
        skipped.push({
          productId: product.id,
          title: product.title,
          reason: `Only ${product.stockQty} left, quantity adjusted`,
        });
      }
      await prisma.cartItem.upsert({
        where: { cartId_productId: { cartId: cart.id, productId: product.id } },
        create: { cartId: cart.id, productId: product.id, qty },
        update: { qty },
      });
    }

    return res.json({ cart: await loadCart(owner, tenantId), skipped });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: "Invalid cart items" });
    }
    return next(err);
  }
});

const patchSchema = z.object({
  qty: z.coerce.number().int().min(0).max(99),
});

cartsRouter.patch("/:slug/items/:itemId", async (req, res, next) => {
  try {
    const body = patchSchema.parse(req.body);
    const owner = ownerFromReq(req, res);
    const cart = await findCart(owner, req.tenant!.tenantId);
    if (!cart) {
      return res.status(404).json({ error: "Cart not found" });
    }

    const item = await prisma.cartItem.findFirst({
      where: { id: req.params.itemId, cartId: cart.id },
      include: { product: true },
    });
    if (!item) {
      return res.status(404).json({ error: "Cart item not found" });
    }

    if (body.qty === 0) {
      await prisma.cartItem.delete({ where: { id: item.id } });
    } else {
      if (item.product.stockQty < body.qty) {
        return res.status(400).json({ error: "Insufficient stock" });
      }
      await prisma.cartItem.update({
        where: { id: item.id },
        data: { qty: body.qty },
      });
    }

    return res.json({ cart: await loadCart(owner, req.tenant!.tenantId) });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res
        .status(400)
        .json({ error: "Validation failed", details: err.flatten() });
    }
    return next(err);
  }
});

