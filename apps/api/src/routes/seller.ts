import { Router } from "express";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "../db/prisma";
import { cancelPaidOrder, RefundError } from "../services/orders";
import { requireAuth } from "../auth/middleware";
import { requireTenantFromMembership, requireTenantRoles } from "../tenant/middleware";
import { tenantWhere } from "../tenant/tenantContext";
import { setActiveShopCookie } from "../tenant/activeShop";
import { toOrderPublic, toProductPublic, toTenantPublic } from "../lib/serialize";
import {
  toShopBannerPublic,
  toShopCategoryPublic,
} from "../lib/shopSerialize";
import {
  parseProductImageAssets,
  serializeProductImageAssets,
} from "../lib/productImages";
import { resolveShopWatermarkDefault, getWatermarkPrefs } from "../lib/watermarkSettings";
import { ImageRejectedError, normalizeImage } from "../services/images";
import { watermarkedCopy } from "../services/imageEnhance";
import { newKey, publicUrl, putObject } from "../lib/storage";
import { imageRef, memoryUpload, ownMediaUrl, receiveSingle, UploadError } from "../lib/uploads";
import { chatEmbedSchema } from "../lib/chatEmbed";
import { safeLink, whatsappTarget } from "../lib/safeUrl";
import { redisRateLimit } from "../lib/rateLimit";

const upload = memoryUpload(5 * 1024 * 1024);
const uploadLimiter = redisRateLimit({ name: "seller-upload", windowMs: 10 * 60_000, max: 120, by: "user" });

const productSchema = z.object({
  title: z.string().min(2).max(200),
  description: z.string().min(1).max(10_000),
  price: z.coerce.number().positive(),
  compareAtPrice: z.coerce.number().positive().nullable().optional(),
  currency: z.string().length(3).default("NGN"),
  stockQty: z.coerce.number().int().min(0).default(0),
  categoryId: z.string().nullable().optional(),
  shopCategoryId: z.string().nullable().optional(),
  brandName: z.string().max(120).nullable().optional(),
  brandId: z.string().nullable().optional(),
  location: z.string().max(120).nullable().optional(),
  countryCode: z.string().length(2).nullable().optional(),
  stateCode: z.string().max(10).nullable().optional(),
  images: z
    .array(
      z.union([
        imageRef,
        z.object({
          original: imageRef,
          watermarked: imageRef.nullable().optional(),
        }),
      ])
    )
    .max(10)
    .default([]),
  watermarkEnabled: z.boolean().optional(),
  status: z.enum(["draft", "active", "archived"]).optional(),
  aiGeneratedDescription: z.boolean().optional(),
});

const patchSchema = productSchema.partial();

function normalizeProductImages(
  images: z.infer<typeof productSchema>["images"]
) {
  return serializeProductImageAssets(parseProductImageAssets(images));
}

/** Category and brand are platform-wide; shop categories must belong to this shop. */
async function invalidProductRef(
  tenantId: string,
  body: { categoryId?: string | null; shopCategoryId?: string | null; brandId?: string | null }
): Promise<string | null> {
  if (body.shopCategoryId) {
    const ok = await prisma.shopCategory.findFirst({
      where: { id: body.shopCategoryId, tenantId },
      select: { id: true },
    });
    if (!ok) return "That shop category doesn't exist.";
  }
  if (body.categoryId) {
    const ok = await prisma.category.findUnique({ where: { id: body.categoryId }, select: { id: true } });
    if (!ok) return "That category doesn't exist.";
  }
  if (body.brandId) {
    const ok = await prisma.brand.findUnique({ where: { id: body.brandId }, select: { id: true } });
    if (!ok) return "That brand doesn't exist.";
  }
  return null;
}

export const sellerRouter = Router();

sellerRouter.use(requireAuth, requireTenantFromMembership());

const UPLOAD_KINDS = {
  product: { maxSize: 1600, animated: false, watermark: true },
  logo: { maxSize: 1024, animated: false, watermark: false },
  banner: { maxSize: 2400, animated: false, watermark: false },
} as const;

/** Shops this user belongs to, for the dashboard shop switcher. */
sellerRouter.get("/shops", async (req, res, next) => {
  try {
    const memberships = await prisma.tenantAdmin.findMany({
      where: { userId: req.user!.id },
      include: { tenant: { select: { id: true, name: true, slug: true } } },
      orderBy: { tenant: { createdAt: "asc" } },
    });
    return res.json({
      activeTenantId: req.tenant!.tenantId,
      shops: memberships.map((m) => ({ ...m.tenant, role: m.role })),
    });
  } catch (err) {
    return next(err);
  }
});

sellerRouter.post("/active-shop", async (req, res, next) => {
  try {
    const { tenantId } = z.object({ tenantId: z.string().min(1).max(40) }).parse(req.body);
    const membership = await prisma.tenantAdmin.findUnique({
      where: { tenantId_userId: { tenantId, userId: req.user!.id } },
    });
    if (!membership) return res.status(404).json({ error: "Shop not found" });
    setActiveShopCookie(res, tenantId);
    return res.json({ ok: true });
  } catch (err) {
    if (err instanceof z.ZodError) return res.status(400).json({ error: "Validation failed" });
    return next(err);
  }
});

sellerRouter.post("/uploads", uploadLimiter, async (req, res, next) => {
  try {
    const kindName =
      (Object.keys(UPLOAD_KINDS) as (keyof typeof UPLOAD_KINDS)[]).find((k) => k === req.query.kind) ??
      "product";
    const kind = UPLOAD_KINDS[kindName];
    const file = await receiveSingle(upload, "file", req, res);
    const tenantId = req.tenant!.tenantId;
    const { buffer } = await normalizeImage(file.buffer, { maxSize: kind.maxSize });
    const key = newKey(`t/${tenantId}/${kindName}s`, "webp");
    await putObject("public", key, buffer, "image/webp");
    const url = publicUrl(key);

    const watermarkedUrl = kind.watermark ? await watermarkedCopy(tenantId, buffer) : null;

    return res.status(201).json({ url, originalUrl: url, watermarkedUrl });
  } catch (err) {
    if (err instanceof UploadError || err instanceof ImageRejectedError) {
      return res.status(400).json({ error: err.message });
    }
    return next(err);
  }
});

sellerRouter.get("/products", async (req, res, next) => {
  try {
    const products = await prisma.product.findMany({
      where: tenantWhere(req.tenant!),
      include: {
        category: true,
        shopCategory: true,
        brand: true,
        tenant: { select: { id: true, name: true, slug: true, verifiedBadge: true } },
      },
      orderBy: { createdAt: "desc" },
    });
    return res.json({ products: products.map((p) => toProductPublic(p, { includeOriginals: true })) });
  } catch (err) {
    return next(err);
  }
});

sellerRouter.post("/products", async (req, res, next) => {
  try {
    const body = productSchema.parse(req.body);
    const refError = await invalidProductRef(req.tenant!.tenantId, body);
    if (refError) return res.status(400).json({ error: refError });
    if (body.status === "active") {
      const { assertCanPublishProduct, PlanLimitError } = await import(
        "../lib/plans"
      );
      try {
        await assertCanPublishProduct(req.tenant!.tenantId);
      } catch (err) {
        if (err instanceof PlanLimitError) {
          return res.status(err.status).json({ error: err.message, code: "PLAN_LIMIT" });
        }
        throw err;
      }
    }
    const product = await prisma.product.create({
      data: {
        tenantId: req.tenant!.tenantId,
        title: body.title,
        description: body.description,
        price: body.price,
        compareAtPrice: body.compareAtPrice ?? null,
        currency: body.currency,
        stockQty: body.stockQty,
        categoryId: body.categoryId ?? null,
        shopCategoryId: body.shopCategoryId ?? null,
        brandName: body.brandName ?? null,
        brandId: body.brandId ?? null,
        location: body.location ?? null,
        countryCode: body.countryCode?.toUpperCase() ?? null,
        stateCode: body.stateCode ?? null,
        images: normalizeProductImages(body.images) as unknown as Prisma.InputJsonValue,
        watermarkEnabled:
          body.watermarkEnabled ??
          (await resolveShopWatermarkDefault(req.tenant!.tenantId)),
        status: body.status ?? "draft",
        aiGeneratedDescription: body.aiGeneratedDescription ?? false,
      },
      include: {
        category: true,
        shopCategory: true,
        brand: true,
        tenant: { select: { id: true, name: true, slug: true, verifiedBadge: true } },
      },
    });
    return res.status(201).json({ product: toProductPublic(product, { includeOriginals: true }) });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: "Validation failed", details: err.flatten() });
    }
    return next(err);
  }
});

sellerRouter.patch("/products/:id", async (req, res, next) => {
  try {
    const body = patchSchema.parse(req.body);
    const existing = await prisma.product.findFirst({
      where: tenantWhere(req.tenant!, { id: req.params.id }),
    });
    if (!existing) {
      return res.status(404).json({ error: "Product not found" });
    }
    const refError = await invalidProductRef(req.tenant!.tenantId, body);
    if (refError) return res.status(400).json({ error: refError });

    if (body.status === "active" && existing.status !== "active") {
      const { assertCanPublishProduct, PlanLimitError } = await import(
        "../lib/plans"
      );
      try {
        await assertCanPublishProduct(req.tenant!.tenantId, existing.id);
      } catch (err) {
        if (err instanceof PlanLimitError) {
          return res.status(err.status).json({ error: err.message, code: "PLAN_LIMIT" });
        }
        throw err;
      }
    }

    const product = await prisma.product.update({
      where: { id: existing.id },
      data: {
        ...(body.title != null ? { title: body.title } : {}),
        ...(body.description != null ? { description: body.description } : {}),
        ...(body.price != null ? { price: body.price } : {}),
        ...(body.compareAtPrice !== undefined
          ? { compareAtPrice: body.compareAtPrice }
          : {}),
        ...(body.currency != null ? { currency: body.currency } : {}),
        ...(body.stockQty != null ? { stockQty: body.stockQty } : {}),
        ...(body.categoryId !== undefined ? { categoryId: body.categoryId } : {}),
        ...(body.shopCategoryId !== undefined
          ? { shopCategoryId: body.shopCategoryId }
          : {}),
        ...(body.brandName !== undefined ? { brandName: body.brandName } : {}),
        ...(body.brandId !== undefined ? { brandId: body.brandId } : {}),
        ...(body.location !== undefined ? { location: body.location } : {}),
        ...(body.countryCode !== undefined
          ? { countryCode: body.countryCode?.toUpperCase() ?? null }
          : {}),
        ...(body.stateCode !== undefined ? { stateCode: body.stateCode } : {}),
        ...(body.images != null
          ? { images: normalizeProductImages(body.images) as unknown as Prisma.InputJsonValue }
          : {}),
        ...(body.watermarkEnabled != null
          ? { watermarkEnabled: body.watermarkEnabled }
          : {}),
        ...(body.status != null ? { status: body.status } : {}),
        ...(body.aiGeneratedDescription != null
          ? { aiGeneratedDescription: body.aiGeneratedDescription }
          : {}),
      },
      include: {
        category: true,
        shopCategory: true,
        brand: true,
        tenant: { select: { id: true, name: true, slug: true, verifiedBadge: true } },
      },
    });
    return res.json({ product: toProductPublic(product, { includeOriginals: true }) });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: "Validation failed", details: err.flatten() });
    }
    return next(err);
  }
});

sellerRouter.delete("/products/:id", requireTenantRoles("owner", "manager"), async (req, res, next) => {
  try {
    const existing = await prisma.product.findFirst({
      where: tenantWhere(req.tenant!, { id: req.params.id }),
    });
    if (!existing) {
      return res.status(404).json({ error: "Product not found" });
    }
    await prisma.product.delete({ where: { id: existing.id } });
    return res.json({ ok: true });
  } catch (err) {
    return next(err);
  }
});

sellerRouter.get("/orders", async (req, res, next) => {
  try {
    const orders = await prisma.order.findMany({
      where: tenantWhere(req.tenant!),
      include: {
        items: {
          include: { product: { select: { id: true, title: true, images: true } } },
        },
        tenant: {
          select: { id: true, name: true, slug: true, verifiedBadge: true },
        },
        buyer: { select: { id: true, email: true, name: true } },
      },
      orderBy: { createdAt: "desc" },
    });
    return res.json({ orders: orders.map(toOrderPublic) });
  } catch (err) {
    return next(err);
  }
});

sellerRouter.get("/orders/:id", async (req, res, next) => {
  try {
    const order = await prisma.order.findFirst({
      where: tenantWhere(req.tenant!, { id: req.params.id }),
      include: {
        items: {
          include: { product: { select: { id: true, title: true, images: true } } },
        },
        tenant: {
          select: { id: true, name: true, slug: true, verifiedBadge: true },
        },
        buyer: { select: { id: true, email: true, name: true } },
      },
    });
    if (!order) {
      return res.status(404).json({ error: "Order not found" });
    }
    return res.json({ order: toOrderPublic(order) });
  } catch (err) {
    return next(err);
  }
});

/**
 * Seller status updates - uses existing OrderStatus enum:
 * pending_payment | paid | fulfilled | cancelled | failed
 * Sellers fulfil paid orders, cancel unpaid ones, or cancel a paid one with a full refund.
 */
sellerRouter.patch("/orders/:id", async (req, res, next) => {
  try {
    const body = z
      .object({
        status: z.enum(["fulfilled", "cancelled"]),
      })
      .parse(req.body);

    const existing = await prisma.order.findFirst({
      where: tenantWhere(req.tenant!, { id: req.params.id }),
    });
    if (!existing) {
      return res.status(404).json({ error: "Order not found" });
    }

    const allowed: Record<string, string[]> = {
      pending_payment: ["cancelled"],
      paid: ["fulfilled", "cancelled"],
      fulfilled: [],
      cancelled: [],
      failed: [],
    };
    if (body.status === "cancelled" && req.tenant!.membershipRole === "staff") {
      return res.status(403).json({ error: "Only the owner or a manager can cancel orders" });
    }
    const nextStatuses = allowed[existing.status] ?? [];
    if (!nextStatuses.includes(body.status)) {
      return res.status(400).json({
        error: `Cannot change status from ${existing.status} to ${body.status}`,
      });
    }

    if (existing.status === "paid" && body.status === "cancelled") {
      try {
        await cancelPaidOrder(existing.id, req.tenant!.tenantId);
      } catch (err) {
        if (err instanceof RefundError) return res.status(err.status).json({ error: err.message });
        throw err;
      }
    } else {
      const moved = await prisma.order.updateMany({
        where: { id: existing.id, status: existing.status },
        data: { status: body.status },
      });
      if (!moved.count) return res.status(409).json({ error: "Order changed, refresh and try again" });
    }

    const order = await prisma.order.findUniqueOrThrow({
      where: { id: existing.id },
      include: {
        items: {
          include: { product: { select: { id: true, title: true, images: true } } },
        },
        tenant: {
          select: { id: true, name: true, slug: true, verifiedBadge: true },
        },
        buyer: { select: { id: true, email: true, name: true } },
      },
    });
    return res.json({ order: toOrderPublic(order) });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res
        .status(400)
        .json({ error: "Validation failed", details: err.flatten() });
    }
    return next(err);
  }
});

sellerRouter.get("/stats", async (req, res, next) => {
  try {
    const tenantId = req.tenant!.tenantId;
    const [productCount, orderCount, paid] = await Promise.all([
      prisma.product.count({ where: tenantWhere(req.tenant!) }),
      prisma.order.count({ where: tenantWhere(req.tenant!) }),
      prisma.order.findMany({
        where: {
          tenantId,
          status: { in: ["paid", "fulfilled"] },
        },
        select: { total: true, currency: true },
      }),
    ]);
    const salesTotal = paid.reduce((sum, o) => sum + Number(o.total), 0);
    return res.json({
      stats: {
        productCount,
        orderCount,
        salesTotal,
        currency: paid[0]?.currency ?? "NGN",
        tenantId,
      },
    });
  } catch (err) {
    return next(err);
  }
});

const hexColor = z
  .string()
  .regex(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/, "Invalid hex color")
  .nullable()
  .optional();

function themeFromJson(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? { ...(value as Record<string, unknown>) }
    : {};
}

/** Bank details are visible in full to the owner only. */
function settlementFields(
  t: {
    settlementBankCode: string | null;
    settlementAccountNumber: string | null;
    settlementAccountName: string | null;
    paystackSubaccountCode: string | null;
  },
  role: string | undefined
) {
  const owner = role === "owner";
  const acct = t.settlementAccountNumber;
  return {
    viewerRole: role ?? null,
    settlementBankCode: t.settlementBankCode,
    settlementAccountName: t.settlementAccountName,
    settlementAccountNumber: owner || !acct ? acct : `******${acct.slice(-4)}`,
    paystackSubaccountCode: owner ? t.paystackSubaccountCode : null,
  };
}

/** Shop profile: name/location + seller-editable Wave 1 fields. */
sellerRouter.get("/shop", async (req, res, next) => {
  try {
    const tenant = await prisma.tenant.findUnique({
      where: { id: req.tenant!.tenantId },
    });
    if (!tenant) return res.status(404).json({ error: "Shop not found" });
    const theme = themeFromJson(tenant.themeSettings);
    const publicTenant = toTenantPublic(tenant, { private: true });
    const wm = await getWatermarkPrefs(tenant.id);
    return res.json({
      shop: {
        ...publicTenant,
        description: (theme.shopDescription as string) ?? null,
        contactEmail: publicTenant.email ?? (theme.contactEmail as string) ?? null,
        contactPhone: publicTenant.phone ?? (theme.contactPhone as string) ?? null,
        contactFormEnabled: theme.contactFormEnabled !== false,
        watermarkDefaultOn: wm.shopOverride,
        watermarkPlatformDefault: wm.platformDefault,
        ...settlementFields(tenant, req.tenant!.membershipRole),
      },
    });
  } catch (err) {
    return next(err);
  }
});

sellerRouter.patch("/shop", requireTenantRoles("owner", "manager"), async (req, res, next) => {
  try {
    const body = z
      .object({
        name: z.string().min(2).max(120).optional(),
        location: z.string().max(120).nullable().optional(),
        countryCode: z.string().length(2).nullable().optional(),
        stateCode: z.string().max(10).nullable().optional(),
        address: z.string().max(2000).nullable().optional(),
        phone: z.string().min(5).max(32).nullable().optional(),
        email: z.string().email().nullable().optional(),
        socialLinks: z
          .record(z.string().max(40), z.union([safeLink(500), z.literal("")]))
          .refine((r) => Object.keys(r).length <= 20)
          .nullable()
          .optional(),
        faqContent: z
          .array(
            z.object({
              question: z.string().min(1).max(500),
              answer: z.string().min(1).max(5000),
            })
          )
          .max(50)
          .nullable()
          .optional(),
        termsText: z.string().max(100_000).nullable().optional(),
        privacyText: z.string().max(100_000).nullable().optional(),
        description: z.string().max(2000).nullable().optional(),
        contactEmail: z.string().email().nullable().optional(),
        contactPhone: z.string().min(5).max(32).nullable().optional(),
        contactFormEnabled: z.boolean().optional(),
        watermarkDefaultOn: z.boolean().nullable().optional(),
        tickerEnabled: z.boolean().optional(),
        tickerText: z.string().max(400).nullable().optional(),
        tickerSpeed: z.coerce.number().min(4).max(30).optional(),
        tickerBg: z.string().max(20).nullable().optional(),
        tickerColor: z.string().max(20).nullable().optional(),
        whatsappUrl: whatsappTarget.nullable().optional(),
        chatEmbed: chatEmbedSchema.nullable().optional(),
      })
      .parse(req.body);

    if (req.body && typeof req.body === "object" && ("settlementBankCode" in req.body || "settlementAccountNumber" in req.body)) {
      return res.status(400).json({ error: "Bank details are saved from the payout account form" });
    }

    const tenant = await prisma.tenant.findUnique({
      where: { id: req.tenant!.tenantId },
    });
    if (!tenant) return res.status(404).json({ error: "Shop not found" });

    const prev = themeFromJson(tenant.themeSettings);
    const theme = { ...prev };
    if (body.description !== undefined) theme.shopDescription = body.description;
    if (body.contactEmail !== undefined) theme.contactEmail = body.contactEmail;
    if (body.contactPhone !== undefined) theme.contactPhone = body.contactPhone;
    if (body.contactFormEnabled !== undefined) {
      theme.contactFormEnabled = body.contactFormEnabled;
    }
    if (body.tickerEnabled !== undefined) theme.tickerEnabled = body.tickerEnabled;
    if (body.tickerText !== undefined) theme.tickerText = body.tickerText;
    if (body.tickerSpeed !== undefined) theme.tickerSpeed = body.tickerSpeed;
    if (body.tickerBg !== undefined) theme.tickerBg = body.tickerBg;
    if (body.tickerColor !== undefined) theme.tickerColor = body.tickerColor;
    if (body.whatsappUrl !== undefined) theme.whatsappUrl = body.whatsappUrl;
    if (body.chatEmbed !== undefined) theme.chatEmbed = body.chatEmbed;
    delete theme.chatbotHtml;

    const email =
      body.email !== undefined
        ? body.email
        : body.contactEmail !== undefined
          ? body.contactEmail
          : undefined;
    const phone =
      body.phone !== undefined
        ? body.phone
        : body.contactPhone !== undefined
          ? body.contactPhone
          : undefined;

    const notifPrev =
      tenant.notificationSettings &&
      typeof tenant.notificationSettings === "object" &&
      !Array.isArray(tenant.notificationSettings)
        ? { ...(tenant.notificationSettings as Record<string, unknown>) }
        : {};
    if (body.watermarkDefaultOn !== undefined) {
      notifPrev.watermarkDefaultOn = body.watermarkDefaultOn;
    }

    const updated = await prisma.tenant.update({
      where: { id: tenant.id },
      data: {
        ...(body.name != null ? { name: body.name } : {}),
        ...(body.location !== undefined ? { location: body.location } : {}),
        ...(body.countryCode !== undefined
          ? { countryCode: body.countryCode?.toUpperCase() ?? null }
          : {}),
        ...(body.stateCode !== undefined ? { stateCode: body.stateCode } : {}),
        ...(body.address !== undefined ? { address: body.address } : {}),
        ...(phone !== undefined ? { phone } : {}),
        ...(email !== undefined ? { email } : {}),
        ...(body.socialLinks !== undefined
          ? {
              socialLinks:
                body.socialLinks === null
                  ? Prisma.JsonNull
                  : (body.socialLinks as Prisma.InputJsonValue),
            }
          : {}),
        ...(body.faqContent !== undefined
          ? {
              faqContent:
                body.faqContent === null
                  ? Prisma.JsonNull
                  : (body.faqContent as Prisma.InputJsonValue),
            }
          : {}),
        ...(body.termsText !== undefined ? { termsText: body.termsText } : {}),
        ...(body.privacyText !== undefined
          ? { privacyText: body.privacyText }
          : {}),
        themeSettings: theme as Prisma.InputJsonValue,
        ...(body.watermarkDefaultOn !== undefined
          ? { notificationSettings: notifPrev as Prisma.InputJsonValue }
          : {}),
      },
    });

    const refreshed = await prisma.tenant.findUnique({
      where: { id: updated.id },
    });
    const finalTenant = refreshed ?? updated;
    const nextTheme = themeFromJson(finalTenant.themeSettings);
    const publicTenant = toTenantPublic(finalTenant, { private: true });
    const wm = await getWatermarkPrefs(finalTenant.id);
    return res.json({
      shop: {
        ...publicTenant,
        description: (nextTheme.shopDescription as string) ?? null,
        contactEmail:
          publicTenant.email ?? (nextTheme.contactEmail as string) ?? null,
        contactPhone:
          publicTenant.phone ?? (nextTheme.contactPhone as string) ?? null,
        contactFormEnabled: nextTheme.contactFormEnabled !== false,
        watermarkDefaultOn: wm.shopOverride,
        watermarkPlatformDefault: wm.platformDefault,
        ...settlementFields(finalTenant, req.tenant!.membershipRole),
      },
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res
        .status(400)
        .json({ error: "Validation failed", details: err.flatten() });
    }
    return next(err);
  }
});

sellerRouter.get("/branding", async (req, res, next) => {
  try {
    const tenant = await prisma.tenant.findUnique({
      where: { id: req.tenant!.tenantId },
    });
    if (!tenant) return res.status(404).json({ error: "Shop not found" });
    const theme = themeFromJson(tenant.themeSettings);
    return res.json({
      branding: {
        logoUrl: (theme.logoUrl as string) ?? null,
        logoRectUrl: (theme.logoRectUrl as string) ?? null,
        logoBuilder: (theme.logoBuilder as Record<string, unknown>) ?? null,
        primaryColor: (theme.primaryColor as string) ?? null,
        accentColor: (theme.accentColor as string) ?? null,
        promoProductsEnabled: theme.promoProductsEnabled === true,
        newArrivalsEnabled: theme.newArrivalsEnabled === true,
        newArrivalsDays:
          typeof theme.newArrivalsDays === "number"
            ? theme.newArrivalsDays
            : 30,
        storeTheme: typeof theme.storeTheme === "string" ? theme.storeTheme : "classic",
        shopName: tenant.name,
        slug: tenant.slug,
      },
      themeSettings: theme,
    });
  } catch (err) {
    return next(err);
  }
});

sellerRouter.patch("/branding", requireTenantRoles("owner", "manager"), async (req, res, next) => {
  try {
    const body = z
      .object({
        logoUrl: z
          .union([ownMediaUrl, z.literal(""), z.null()])
          .optional(),
        logoRectUrl: z
          .union([ownMediaUrl, z.literal(""), z.null()])
          .optional(),
        logoBuilder: z
          .object({
            iconId: z.string().max(64).optional(),
            color: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
            fontPairId: z.string().max(64).optional(),
          })
          .nullable()
          .optional(),
        primaryColor: hexColor,
        accentColor: hexColor,
        promoProductsEnabled: z.boolean().optional(),
        newArrivalsEnabled: z.boolean().optional(),
        newArrivalsDays: z.coerce.number().int().min(1).max(365).optional(),
        storeTheme: z
          .enum(["classic", "mono", "runway", "atelier", "bazaar", "pop"])
          .optional(),
      })
      .parse(req.body);

    const tenant = await prisma.tenant.findUnique({
      where: { id: req.tenant!.tenantId },
    });
    if (!tenant) return res.status(404).json({ error: "Shop not found" });

    const theme = themeFromJson(tenant.themeSettings);
    if (body.storeTheme !== undefined) {
      theme.storeTheme = body.storeTheme;
    }
    if (body.logoUrl !== undefined) {
      theme.logoUrl = body.logoUrl === "" ? null : body.logoUrl;
    }
    if (body.logoRectUrl !== undefined) {
      theme.logoRectUrl = body.logoRectUrl === "" ? null : body.logoRectUrl;
    }
    if (body.logoBuilder !== undefined) {
      theme.logoBuilder = body.logoBuilder;
    }
    if (body.primaryColor !== undefined) {
      theme.primaryColor = body.primaryColor;
    }
    if (body.accentColor !== undefined) {
      theme.accentColor = body.accentColor;
    }
    if (body.promoProductsEnabled !== undefined) {
      theme.promoProductsEnabled = body.promoProductsEnabled;
    }
    if (body.newArrivalsEnabled !== undefined) {
      theme.newArrivalsEnabled = body.newArrivalsEnabled;
    }
    if (body.newArrivalsDays !== undefined) {
      theme.newArrivalsDays = body.newArrivalsDays;
    }

    const updated = await prisma.tenant.update({
      where: { id: tenant.id },
      data: { themeSettings: theme as Prisma.InputJsonValue },
    });
    const nextTheme = themeFromJson(updated.themeSettings);
    return res.json({
      branding: {
        logoUrl: (nextTheme.logoUrl as string) ?? null,
        logoRectUrl: (nextTheme.logoRectUrl as string) ?? null,
        primaryColor: (nextTheme.primaryColor as string) ?? null,
        accentColor: (nextTheme.accentColor as string) ?? null,
        storeTheme:
          typeof nextTheme.storeTheme === "string" ? nextTheme.storeTheme : "classic",
        shopName: updated.name,
        slug: updated.slug,
      },
      themeSettings: nextTheme,
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res
        .status(400)
        .json({ error: "Validation failed", details: err.flatten() });
    }
    return next(err);
  }
});

function slugifyCategory(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80) || "category";
}

sellerRouter.get("/shop-categories", async (req, res, next) => {
  try {
    const rows = await prisma.shopCategory.findMany({
      where: tenantWhere(req.tenant!),
      orderBy: { name: "asc" },
    });
    return res.json({ categories: rows.map(toShopCategoryPublic) });
  } catch (err) {
    return next(err);
  }
});

sellerRouter.post("/shop-categories", requireTenantRoles("owner", "manager"), async (req, res, next) => {
  try {
    const body = z
      .object({
        name: z.string().min(1).max(80),
        slug: z.string().min(1).max(80).optional(),
      })
      .parse(req.body);
    const slug = body.slug ?? slugifyCategory(body.name);
    const row = await prisma.shopCategory.create({
      data: {
        tenantId: req.tenant!.tenantId,
        name: body.name,
        slug,
      },
    });
    return res.status(201).json({ category: toShopCategoryPublic(row) });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: "Validation failed", details: err.flatten() });
    }
    return next(err);
  }
});

sellerRouter.patch("/shop-categories/:id", requireTenantRoles("owner", "manager"), async (req, res, next) => {
  try {
    const body = z
      .object({
        name: z.string().min(1).max(80).optional(),
        slug: z.string().min(1).max(80).optional(),
      })
      .parse(req.body);
    const existing = await prisma.shopCategory.findFirst({
      where: tenantWhere(req.tenant!, { id: req.params.id }),
    });
    if (!existing) return res.status(404).json({ error: "Category not found" });
    const row = await prisma.shopCategory.update({
      where: { id: existing.id },
      data: {
        ...(body.name != null ? { name: body.name } : {}),
        ...(body.slug != null ? { slug: body.slug } : {}),
      },
    });
    return res.json({ category: toShopCategoryPublic(row) });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: "Validation failed", details: err.flatten() });
    }
    return next(err);
  }
});

sellerRouter.delete("/shop-categories/:id", requireTenantRoles("owner", "manager"), async (req, res, next) => {
  try {
    const existing = await prisma.shopCategory.findFirst({
      where: tenantWhere(req.tenant!, { id: req.params.id }),
    });
    if (!existing) return res.status(404).json({ error: "Category not found" });
    await prisma.shopCategory.delete({ where: { id: existing.id } });
    return res.json({ ok: true });
  } catch (err) {
    return next(err);
  }
});

const bannerSchema = z.object({
  imageUrl: imageRef,
  title: z.string().max(200).nullable().optional(),
  subtitle: z.string().max(500).nullable().optional(),
  ctaText: z.string().max(80).nullable().optional(),
  ctaUrl: z.union([safeLink(2000), z.literal("")]).nullable().optional(),
  scrollSpeed: z.coerce.number().int().min(1).max(100).optional(),
  displayOrder: z.coerce.number().int().optional(),
  active: z.boolean().optional(),
});

sellerRouter.get("/banners", async (req, res, next) => {
  try {
    const rows = await prisma.shopBanner.findMany({
      where: tenantWhere(req.tenant!),
      orderBy: [{ displayOrder: "asc" }, { createdAt: "asc" }],
    });
    return res.json({ banners: rows.map(toShopBannerPublic) });
  } catch (err) {
    return next(err);
  }
});

sellerRouter.post("/banners", requireTenantRoles("owner", "manager"), async (req, res, next) => {
  try {
    const body = bannerSchema.parse(req.body);
    const row = await prisma.shopBanner.create({
      data: {
        tenantId: req.tenant!.tenantId,
        imageUrl: body.imageUrl,
        title: body.title ?? null,
        subtitle: body.subtitle ?? null,
        ctaText: body.ctaText ?? null,
        ctaUrl: body.ctaUrl ?? null,
        scrollSpeed: body.scrollSpeed ?? 5,
        displayOrder: body.displayOrder ?? 0,
        active: body.active ?? true,
      },
    });
    return res.status(201).json({ banner: toShopBannerPublic(row) });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: "Validation failed", details: err.flatten() });
    }
    return next(err);
  }
});

sellerRouter.patch("/banners/:id", requireTenantRoles("owner", "manager"), async (req, res, next) => {
  try {
    const body = bannerSchema.partial().parse(req.body);
    const existing = await prisma.shopBanner.findFirst({
      where: tenantWhere(req.tenant!, { id: req.params.id }),
    });
    if (!existing) return res.status(404).json({ error: "Banner not found" });
    const row = await prisma.shopBanner.update({
      where: { id: existing.id },
      data: {
        ...(body.imageUrl != null ? { imageUrl: body.imageUrl } : {}),
        ...(body.title !== undefined ? { title: body.title } : {}),
        ...(body.subtitle !== undefined ? { subtitle: body.subtitle } : {}),
        ...(body.ctaText !== undefined ? { ctaText: body.ctaText } : {}),
        ...(body.ctaUrl !== undefined ? { ctaUrl: body.ctaUrl } : {}),
        ...(body.scrollSpeed != null ? { scrollSpeed: body.scrollSpeed } : {}),
        ...(body.displayOrder != null ? { displayOrder: body.displayOrder } : {}),
        ...(body.active != null ? { active: body.active } : {}),
      },
    });
    return res.json({ banner: toShopBannerPublic(row) });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: "Validation failed", details: err.flatten() });
    }
    return next(err);
  }
});

sellerRouter.delete("/banners/:id", requireTenantRoles("owner", "manager"), async (req, res, next) => {
  try {
    const existing = await prisma.shopBanner.findFirst({
      where: tenantWhere(req.tenant!, { id: req.params.id }),
    });
    if (!existing) return res.status(404).json({ error: "Banner not found" });
    await prisma.shopBanner.delete({ where: { id: existing.id } });
    return res.json({ ok: true });
  } catch (err) {
    return next(err);
  }
});
