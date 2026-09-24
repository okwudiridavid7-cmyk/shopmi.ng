import path from "path";
import fs from "fs";
import { Router } from "express";
import multer from "multer";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "../db/prisma";
import { env } from "../config/env";
import { requireAuth } from "../auth/middleware";
import { requireTenantFromMembership } from "../tenant/middleware";
import { tenantWhere } from "../tenant/tenantContext";
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
import {
  getWatermarkQueue,
  type WatermarkJobPayload,
} from "../queue/connection";

fs.mkdirSync(env.uploadsDir, { recursive: true });

const upload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, env.uploadsDir),
    filename: (_req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase() || ".jpg";
      cb(null, `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`);
    },
  }),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (!["image/jpeg", "image/png", "image/webp", "image/gif"].includes(file.mimetype)) {
      return cb(new Error("Only JPEG, PNG, WebP, GIF allowed"));
    }
    return cb(null, true);
  },
});

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
        z.string().min(1),
        z.object({
          original: z.string().min(1),
          watermarked: z.string().nullable().optional(),
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

export const sellerRouter = Router();

sellerRouter.use(requireAuth, requireTenantFromMembership());

sellerRouter.post("/uploads", (req, res, next) => {
  upload.single("file")(req, res, async (err) => {
    if (err) {
      return res.status(400).json({ error: err.message || "Upload failed" });
    }
    if (!req.file) {
      return res.status(400).json({ error: "file is required" });
    }
    const url = `${env.apiUrl}/uploads/${req.file.filename}`;
    const enqueueWatermark = req.query.watermark !== "0";
    let watermarkJobId: string | null = null;
    if (enqueueWatermark && req.tenant) {
      try {
        const tenant = await prisma.tenant.findUnique({
          where: { id: req.tenant.tenantId },
        });
        const theme = (tenant?.themeSettings as Record<string, unknown> | null) ?? {};
        const logoUrl =
          typeof theme.logoUrl === "string" ? theme.logoUrl : null;
        const aiJob = await prisma.aiJob.create({
          data: {
            tenantId: req.tenant.tenantId,
            userId: req.user!.id,
            type: "watermark",
            status: "queued",
            input: { originalUrl: url },
          },
        });
        const payload: WatermarkJobPayload = {
          aiJobId: aiJob.id,
          tenantId: req.tenant.tenantId,
          originalUrl: url,
          shopName: tenant?.name ?? "Shop",
          logoUrl,
        };
        await getWatermarkQueue().add("watermark", payload, { jobId: aiJob.id });
        watermarkJobId = aiJob.id;
      } catch (e) {
        console.warn("[upload] watermark enqueue failed", e);
      }
    }
    return res.status(201).json({
      url,
      path: `/uploads/${req.file.filename}`,
      originalUrl: url,
      watermarkJobId,
    });
  });
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
    return res.json({ products: products.map(toProductPublic) });
  } catch (err) {
    return next(err);
  }
});

sellerRouter.post("/products", async (req, res, next) => {
  try {
    const body = productSchema.parse(req.body);
    const { assertCanCreateProduct, PlanLimitError } = await import(
      "../lib/plans"
    );
    try {
      await assertCanCreateProduct(req.tenant!.tenantId);
    } catch (err) {
      if (err instanceof PlanLimitError) {
        return res.status(err.status).json({ error: err.message });
      }
      throw err;
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
    return res.status(201).json({ product: toProductPublic(product) });
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
    return res.json({ product: toProductPublic(product) });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: "Validation failed", details: err.flatten() });
    }
    return next(err);
  }
});

sellerRouter.delete("/products/:id", async (req, res, next) => {
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
 * Seller status updates — uses existing OrderStatus enum:
 * pending_payment | paid | fulfilled | cancelled | failed
 * Sellers may fulfill paid orders or cancel unpaid ones.
 */
sellerRouter.patch("/orders/:id", async (req, res, next) => {
  try {
    const body = z
      .object({
        status: z.enum(["paid", "fulfilled", "cancelled"]),
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
    const nextStatuses = allowed[existing.status] ?? [];
    if (!nextStatuses.includes(body.status)) {
      return res.status(400).json({
        error: `Cannot change status from ${existing.status} to ${body.status}`,
      });
    }

    const order = await prisma.order.update({
      where: { id: existing.id },
      data: { status: body.status },
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

/** Shop profile: name/location + seller-editable Wave 1 fields. */
sellerRouter.get("/shop", async (req, res, next) => {
  try {
    const tenant = await prisma.tenant.findUnique({
      where: { id: req.tenant!.tenantId },
    });
    if (!tenant) return res.status(404).json({ error: "Shop not found" });
    const theme = themeFromJson(tenant.themeSettings);
    const publicTenant = toTenantPublic(tenant);
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
      },
    });
  } catch (err) {
    return next(err);
  }
});

sellerRouter.patch("/shop", async (req, res, next) => {
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
        socialLinks: z.record(z.string().max(500)).nullable().optional(),
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
        whatsappUrl: z.string().max(500).nullable().optional(),
        chatbotHtml: z.string().max(20_000).nullable().optional(),
      })
      .parse(req.body);

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
    if (body.chatbotHtml !== undefined) theme.chatbotHtml = body.chatbotHtml;

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

    const nextTheme = themeFromJson(updated.themeSettings);
    const publicTenant = toTenantPublic(updated);
    const wm = await getWatermarkPrefs(updated.id);
    return res.json({
      shop: {
        ...publicTenant,
        description: (nextTheme.shopDescription as string) ?? null,
        contactEmail: publicTenant.email ?? (nextTheme.contactEmail as string) ?? null,
        contactPhone: publicTenant.phone ?? (nextTheme.contactPhone as string) ?? null,
        contactFormEnabled: nextTheme.contactFormEnabled !== false,
        watermarkDefaultOn: wm.shopOverride,
        watermarkPlatformDefault: wm.platformDefault,
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
        shopName: tenant.name,
        slug: tenant.slug,
      },
      themeSettings: theme,
    });
  } catch (err) {
    return next(err);
  }
});

sellerRouter.patch("/branding", async (req, res, next) => {
  try {
    const body = z
      .object({
        logoUrl: z
          .union([
            z.string().url(),
            z.string().regex(/^\/uploads\//),
            z.literal(""),
            z.null(),
          ])
          .optional(),
        logoRectUrl: z
          .union([
            z.string().url(),
            z.string().regex(/^\/uploads\//),
            z.literal(""),
            z.null(),
          ])
          .optional(),
        logoBuilder: z
          .object({
            iconId: z.string().optional(),
            color: z.string().optional(),
            fontPairId: z.string().optional(),
          })
          .nullable()
          .optional(),
        primaryColor: hexColor,
        accentColor: hexColor,
        promoProductsEnabled: z.boolean().optional(),
        newArrivalsEnabled: z.boolean().optional(),
        newArrivalsDays: z.coerce.number().int().min(1).max(365).optional(),
      })
      .parse(req.body);

    const tenant = await prisma.tenant.findUnique({
      where: { id: req.tenant!.tenantId },
    });
    if (!tenant) return res.status(404).json({ error: "Shop not found" });

    const theme = themeFromJson(tenant.themeSettings);
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

sellerRouter.post("/shop-categories", async (req, res, next) => {
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

sellerRouter.patch("/shop-categories/:id", async (req, res, next) => {
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

sellerRouter.delete("/shop-categories/:id", async (req, res, next) => {
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
  imageUrl: z.union([
    z.string().url(),
    z.string().regex(/^\/uploads\//, "Must be a URL or /uploads/ path"),
  ]),
  title: z.string().max(200).nullable().optional(),
  subtitle: z.string().max(500).nullable().optional(),
  ctaText: z.string().max(80).nullable().optional(),
  ctaUrl: z.string().max(2000).nullable().optional(),
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

sellerRouter.post("/banners", async (req, res, next) => {
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

sellerRouter.patch("/banners/:id", async (req, res, next) => {
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

sellerRouter.delete("/banners/:id", async (req, res, next) => {
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
