import { Router } from "express";
import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { prisma } from "../db/prisma";
import {
  buildCategoryTree,
  categoryBreadcrumb,
  categoryIdsIncludingDescendants,
} from "../lib/categories";
import {
  toBrandPublic,
  toCategoryPublic,
  toProductPublic,
} from "../lib/serialize";
import { attachReviewAggregates } from "../lib/reviewAggregates";
import { getCatalogStats } from "../lib/catalogStats";
import { catalogStatsLimiter } from "../lib/catalogStatsRateLimit";

export const catalogRouter = Router();

catalogRouter.get("/categories", async (req, res, next) => {
  try {
    const asTree =
      req.query.tree === "1" ||
      req.query.tree === "true" ||
      req.query.format === "tree";
    const categories = await prisma.category.findMany({
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    });
    if (asTree) {
      return res.json({ categories: buildCategoryTree(categories) });
    }
    return res.json({ categories: categories.map(toCategoryPublic) });
  } catch (err) {
    return next(err);
  }
});

catalogRouter.get("/categories/breadcrumb", async (req, res, next) => {
  try {
    const slug = typeof req.query.slug === "string" ? req.query.slug : "";
    if (!slug) {
      return res.status(400).json({ error: "slug is required" });
    }
    const breadcrumb = await categoryBreadcrumb(slug);
    return res.json({ breadcrumb });
  } catch (err) {
    return next(err);
  }
});

/** Distinct free-text brand names from active products (plus legacy Brand table). */
catalogRouter.get("/brands", async (_req, res, next) => {
  try {
    const [legacy, distinctNames] = await Promise.all([
      prisma.brand.findMany({ orderBy: { name: "asc" } }),
      prisma.product.findMany({
        where: {
          status: "active",
          brandName: { not: null },
          tenant: { status: { not: "suspended" } },
        },
        select: { brandName: true },
        distinct: ["brandName"],
        orderBy: { brandName: "asc" },
        take: 500,
      }),
    ]);

    const byKey = new Map<string, { id: string; name: string; slug: string }>();
    for (const b of legacy) {
      byKey.set(b.name.toLowerCase(), toBrandPublic(b));
    }
    for (const row of distinctNames) {
      const name = row.brandName?.trim();
      if (!name) continue;
      const key = name.toLowerCase();
      if (byKey.has(key)) continue;
      const slug = name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "");
      byKey.set(key, { id: `name:${slug || key}`, name, slug: slug || key });
    }

    const brands = [...byKey.values()].sort((a, b) =>
      a.name.localeCompare(b.name)
    );
    return res.json({ brands });
  } catch (err) {
    return next(err);
  }
});

const listSchema = z.object({
  category: z.string().optional(),
  brand: z.string().optional(),
  location: z.string().optional(),
  countryCode: z.string().optional(),
  stateCode: z.string().optional(),
  minPrice: z.coerce.number().optional(),
  maxPrice: z.coerce.number().optional(),
  q: z.string().optional(),
  sort: z
    .enum(["relevance", "newest", "price_asc", "price_desc"])
    .optional()
    .default("relevance"),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(48).default(24),
});

/** Platform-wide marketplace: active products only (no tenant middleware). */
catalogRouter.get("/products", async (req, res, next) => {
  try {
    const query = listSchema.parse(req.query);
    const where: Prisma.ProductWhereInput = {
      status: "active",
      tenant: { status: { not: "suspended" } },
    };

    if (query.category) {
      const ids = await categoryIdsIncludingDescendants(query.category);
      if (!ids || ids.length === 0) {
        return res.json({
          products: [],
          pagination: {
            page: query.page,
            limit: query.limit,
            total: 0,
            pages: 0,
          },
        });
      }
      where.categoryId = { in: ids };
    }
    if (query.brand) {
      where.OR = [
        { brandName: { contains: query.brand } },
        {
          brand: {
            OR: [
              { slug: query.brand },
              { id: query.brand },
              { name: { contains: query.brand } },
            ],
          },
        },
      ];
    }
    if (query.location) {
      where.location = { contains: query.location };
    }
    if (query.countryCode) {
      where.countryCode = query.countryCode.toUpperCase();
    }
    if (query.stateCode) {
      where.stateCode = query.stateCode;
    }
    if (query.minPrice != null || query.maxPrice != null) {
      where.price = {};
      if (query.minPrice != null) where.price.gte = query.minPrice;
      if (query.maxPrice != null) where.price.lte = query.maxPrice;
    }
    if (query.q) {
      where.AND = [
        {
          OR: [
            { title: { contains: query.q } },
            { description: { contains: query.q } },
            { brandName: { contains: query.q } },
          ],
        },
      ];
    }

    const orderBy: Prisma.ProductOrderByWithRelationInput[] =
      query.sort === "price_asc"
        ? [{ price: "asc" }, { createdAt: "desc" }]
        : query.sort === "price_desc"
          ? [{ price: "desc" }, { createdAt: "desc" }]
          : query.sort === "newest"
            ? [{ createdAt: "desc" }]
            : // relevance: prefer query match freshness; without q, newest
              [{ createdAt: "desc" }];

    const skip = (query.page - 1) * query.limit;
    const [total, products] = await Promise.all([
      prisma.product.count({ where }),
      prisma.product.findMany({
        where,
        include: {
          category: true,
          shopCategory: true,
          brand: true,
          tenant: {
            select: { id: true, name: true, slug: true, verifiedBadge: true },
          },
        },
        orderBy,
        skip,
        take: query.limit,
      }),
    ]);

    const withReviews = await attachReviewAggregates(products);

    return res.json({
      products: withReviews.map(toProductPublic),
      pagination: {
        page: query.page,
        limit: query.limit,
        total,
        pages: Math.ceil(total / query.limit),
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

catalogRouter.get("/products/:id", async (req, res, next) => {
  try {
    const product = await prisma.product.findFirst({
      where: {
        id: req.params.id,
        status: "active",
        tenant: { status: { not: "suspended" } },
      },
      include: {
        category: true,
        shopCategory: true,
        brand: true,
        tenant: {
          select: { id: true, name: true, slug: true, verifiedBadge: true },
        },
      },
    });
    if (!product) {
      return res.status(404).json({ error: "Product not found" });
    }
    const [withReviews] = await attachReviewAggregates([product]);
    return res.json({ product: toProductPublic(withReviews) });
  } catch (err) {
    return next(err);
  }
});

catalogRouter.get("/locations", async (_req, res, next) => {
  try {
    const rows = await prisma.product.findMany({
      where: { status: "active", location: { not: null } },
      select: { location: true },
      distinct: ["location"],
      orderBy: { location: "asc" },
      take: 100,
    });
    return res.json({
      locations: rows.map((r) => r.location).filter(Boolean),
    });
  } catch (err) {
    return next(err);
  }
});

/** Public marketplace totals for About / marketing surfaces (Redis-cached, REM-13). */
catalogRouter.get("/stats", catalogStatsLimiter, async (_req, res, next) => {
  try {
    const stats = await getCatalogStats();
    return res.json({ stats });
  } catch (err) {
    return next(err);
  }
});

/** Public marketplace homepage banners (platform_settings.homepage_banners). */
catalogRouter.get("/homepage-banners", async (_req, res, next) => {
  try {
    const row = await prisma.platformSetting.findUnique({
      where: { key: "homepage_banners" },
    });
    let banners: unknown[] = [];
    if (row?.value) {
      try {
        const parsed = JSON.parse(row.value) as unknown;
        if (Array.isArray(parsed)) banners = parsed;
      } catch {
        banners = [];
      }
    }
    const active = banners
      .filter(
        (b): b is Record<string, unknown> =>
          !!b &&
          typeof b === "object" &&
          (b as { active?: boolean }).active !== false
      )
      .sort(
        (a, b) => Number(a.displayOrder ?? 0) - Number(b.displayOrder ?? 0)
      )
      .map((b, i) => ({
        id: String(b.id ?? `platform-${i}`),
        imageUrl: String(b.imageUrl ?? ""),
        title: typeof b.title === "string" ? b.title : null,
        subtitle: typeof b.subtitle === "string" ? b.subtitle : null,
        ctaText: typeof b.ctaText === "string" ? b.ctaText : null,
        ctaUrl: typeof b.ctaUrl === "string" ? b.ctaUrl : null,
        scrollSpeed: typeof b.scrollSpeed === "number" ? b.scrollSpeed : 6,
        active: true,
        displayOrder: typeof b.displayOrder === "number" ? b.displayOrder : i,
      }))
      .filter((b) => b.imageUrl);

    return res.json({ banners: active });
  } catch (err) {
    return next(err);
  }
});
