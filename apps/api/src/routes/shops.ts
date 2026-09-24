import { Router } from "express";
import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { prisma } from "../db/prisma";
import { env } from "../config/env";
import { requireTenantFromSlugParam } from "../tenant/middleware";
import {
  resolveTenantFromHost,
  tenantWhere,
  TenantIsolationError,
} from "../tenant/tenantContext";
import { toProductPublic, toTenantPublic } from "../lib/serialize";
import { toShopBannerPublic, toShopCategoryPublic } from "../lib/shopSerialize";
import { getSellerTrust } from "../lib/sellerTrust";
import { attachReviewAggregates } from "../lib/reviewAggregates";

/**
 * Public storefront API: /api/shops/:slug/...
 * Tenant is resolved server-side from :slug → tenants.slug (never from client headers).
 */
export const shopsRouter = Router();

const productListSchema = z.object({
  category: z.string().optional(),
  shopCategory: z.string().optional(),
  brand: z.string().optional(),
  location: z.string().optional(),
  countryCode: z.string().optional(),
  stateCode: z.string().optional(),
  minPrice: z.coerce.number().optional(),
  maxPrice: z.coerce.number().optional(),
  q: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(48).default(24),
});

const tenantSelect = {
  id: true,
  name: true,
  slug: true,
  verifiedBadge: true,
} as const;

/** Resolve shop from Host header (custom domain or subdomain). */
shopsRouter.get("/resolve-host", async (req, res, next) => {
  try {
    const host = String(req.query.host ?? req.headers.host ?? "");
    const hostname = host.split(":")[0]?.toLowerCase() ?? "";
    const platformHost = new URL(env.webUrl).hostname.toLowerCase();
    const shopBaseHost = env.shopBaseDomain.split(":")[0]?.toLowerCase() ?? "";
    const apexHosts = new Set(
      [platformHost, shopBaseHost, "localhost", "127.0.0.1", "lvh.me"].filter(
        Boolean
      )
    );
    if (!hostname || apexHosts.has(hostname) || hostname === `www.${shopBaseHost}`) {
      return res.json({ tenant: null, platform: true });
    }
    const ctx = await resolveTenantFromHost(host);
    const tenant = await prisma.tenant.findUnique({
      where: { id: ctx.tenantId },
    });
    if (!tenant || tenant.status === "suspended") {
      return res.status(404).json({ error: "Shop not found" });
    }
    return res.json({ tenant: toTenantPublic(tenant), platform: false });
  } catch (err) {
    if (err instanceof TenantIsolationError) {
      return res.status(err.status).json({ error: err.message });
    }
    return next(err);
  }
});

/** Marketplace shop discovery — active / verified-friendly shops. */
shopsRouter.get("/", async (req, res, next) => {
  try {
    const limit = Math.min(
      24,
      Math.max(1, Number.parseInt(String(req.query.limit ?? "12"), 10) || 12)
    );
    const tenants = await prisma.tenant.findMany({
      where: {
        status: { in: ["active", "pending_verification"] },
        products: { some: { status: "active" } },
      },
      orderBy: [{ verifiedBadge: "desc" }, { createdAt: "desc" }],
      take: limit,
      include: {
        _count: { select: { products: { where: { status: "active" } } } },
      },
    });
    return res.json({
      shops: tenants.map((t) => ({
        ...toTenantPublic(t),
        productCount: t._count.products,
      })),
    });
  } catch (err) {
    return next(err);
  }
});

shopsRouter.get(
  "/:slug",
  requireTenantFromSlugParam("slug"),
  async (req, res, next) => {
    try {
      const adminCount = await prisma.tenantAdmin.count({
        where: tenantWhere(req.tenant!),
      });

      const tenant = await prisma.tenant.findUnique({
        where: { id: req.tenant!.tenantId },
      });
      if (!tenant || tenant.status === "suspended") {
        return res.status(404).json({ error: "Shop not found" });
      }

      return res.json({
        tenant: toTenantPublic(tenant),
        context: req.tenant,
        adminCount,
      });
    } catch (err) {
      return next(err);
    }
  }
);

shopsRouter.get(
  "/:slug/products",
  requireTenantFromSlugParam("slug"),
  async (req, res, next) => {
    try {
      const query = productListSchema.parse(req.query);
      const where: Prisma.ProductWhereInput = tenantWhere(req.tenant!, {
        status: "active" as const,
      });

      if (query.category) {
        where.category = {
          OR: [{ slug: query.category }, { id: query.category }],
        };
      }
      if (query.shopCategory) {
        where.shopCategory = {
          OR: [{ slug: query.shopCategory }, { id: query.shopCategory }],
        };
      }
      if (query.brand) {
        where.OR = [
          ...(where.OR ?? []),
          { brandName: { contains: query.brand } },
          { brand: { OR: [{ slug: query.brand }, { id: query.brand }, { name: { contains: query.brand } }] } },
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
          ...(Array.isArray(where.AND) ? where.AND : where.AND ? [where.AND] : []),
          {
            OR: [
              { title: { contains: query.q } },
              { description: { contains: query.q } },
              { brandName: { contains: query.q } },
            ],
          },
        ];
      }

      const skip = (query.page - 1) * query.limit;
      const [total, products] = await Promise.all([
        prisma.product.count({ where }),
        prisma.product.findMany({
          where,
          include: {
            category: true,
            shopCategory: true,
            brand: true,
            tenant: { select: tenantSelect },
          },
          orderBy: { createdAt: "desc" },
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
          pages: Math.max(1, Math.ceil(total / query.limit)),
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
  }
);

shopsRouter.get(
  "/:slug/trust",
  requireTenantFromSlugParam("slug"),
  async (req, res, next) => {
    try {
      const trust = await getSellerTrust(req.tenant!.tenantId);
      if (!trust) {
        return res.status(404).json({ error: "Shop not found" });
      }
      return res.json({ trust });
    } catch (err) {
      return next(err);
    }
  }
);

shopsRouter.get(
  "/:slug/products/:productId/related",
  requireTenantFromSlugParam("slug"),
  async (req, res, next) => {
    try {
      const product = await prisma.product.findFirst({
        where: tenantWhere(req.tenant!, {
          id: req.params.productId,
          status: "active" as const,
        }),
      });
      if (!product) {
        return res.status(404).json({ error: "Product not found" });
      }

      const relatedWhere: Prisma.ProductWhereInput = {
        status: "active",
        id: { not: product.id },
        tenant: { status: { not: "suspended" } },
        OR: [
          ...(product.categoryId
            ? [{ categoryId: product.categoryId }]
            : []),
          ...(product.brandName
            ? [{ brandName: product.brandName }]
            : []),
        ],
      };

      // Prefer same-category marketplace products when OR would be empty.
      if (!product.categoryId && !product.brandName) {
        relatedWhere.OR = undefined;
        relatedWhere.tenantId = { not: product.tenantId };
      }

      const related = await prisma.product.findMany({
        where: relatedWhere,
        include: {
          category: true,
          shopCategory: true,
          brand: true,
          tenant: { select: tenantSelect },
        },
        orderBy: { createdAt: "desc" },
        take: 12,
      });
      const withReviews = await attachReviewAggregates(related);
      return res.json({ products: withReviews.map(toProductPublic) });
    } catch (err) {
      return next(err);
    }
  }
);

shopsRouter.get(
  "/:slug/products/:productId",
  requireTenantFromSlugParam("slug"),
  async (req, res, next) => {
    try {
      const product = await prisma.product.findFirst({
        where: tenantWhere(req.tenant!, {
          id: req.params.productId,
          status: "active" as const,
        }),
        include: {
          category: true,
          shopCategory: true,
          brand: true,
          tenant: { select: tenantSelect },
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
  }
);

shopsRouter.get(
  "/:slug/banners",
  requireTenantFromSlugParam("slug"),
  async (req, res, next) => {
    try {
      const rows = await prisma.shopBanner.findMany({
        where: tenantWhere(req.tenant!, { active: true }),
        orderBy: [{ displayOrder: "asc" }, { createdAt: "asc" }],
      });
      return res.json({ banners: rows.map(toShopBannerPublic) });
    } catch (err) {
      return next(err);
    }
  }
);

shopsRouter.get(
  "/:slug/shop-categories",
  requireTenantFromSlugParam("slug"),
  async (req, res, next) => {
    try {
      const rows = await prisma.shopCategory.findMany({
        where: tenantWhere(req.tenant!),
        orderBy: { name: "asc" },
      });
      return res.json({ categories: rows.map(toShopCategoryPublic) });
    } catch (err) {
      return next(err);
    }
  }
);
