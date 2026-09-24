import { Router } from "express";
import { z } from "zod";
import type { Review } from "@prisma/client";
import type { ReviewPublic } from "@vendors/shared-types";
import { prisma } from "../db/prisma";
import { requireAuth, optionalAuth } from "../auth/middleware";
import { requireTenantFromSlugParam } from "../tenant/middleware";
import { tenantWhere } from "../tenant/tenantContext";

function maskEmail(email: string): string {
  const [user, domain] = email.split("@");
  if (!user || !domain) return "***";
  const visible = user.slice(0, 2);
  return `${visible}***@${domain}`;
}

function toReviewPublic(
  row: Review & { buyer?: { email: string } | null }
): ReviewPublic {
  return {
    id: row.id,
    productId: row.productId,
    buyerId: row.buyerId,
    rating: row.rating,
    comment: row.comment,
    createdAt: row.createdAt.toISOString(),
    buyerEmailMasked: row.buyer ? maskEmail(row.buyer.email) : undefined,
  };
}

async function buyerCanReview(
  buyerId: string,
  productId: string,
  tenantId: string
): Promise<boolean> {
  const order = await prisma.order.findFirst({
    where: {
      buyerId,
      tenantId,
      status: { in: ["paid", "fulfilled"] },
      items: { some: { productId } },
    },
    select: { id: true },
  });
  return Boolean(order);
}

const createSchema = z.object({
  rating: z.coerce.number().int().min(1).max(5),
  comment: z.string().min(2).max(2000),
});

/** Mount under /api/shops/:slug/products/:productId/reviews */
export const productReviewsRouter = Router({ mergeParams: true });

productReviewsRouter.get(
  "/",
  requireTenantFromSlugParam("slug"),
  optionalAuth,
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

      const reviews = await prisma.review.findMany({
        where: { productId: product.id },
        include: { buyer: { select: { email: true } } },
        orderBy: { createdAt: "desc" },
        take: 50,
      });

      const count = reviews.length;
      const average =
        count === 0
          ? 0
          : reviews.reduce((sum, r) => sum + r.rating, 0) / count;

      // Index 0 = 5★ … index 4 = 1★ (matches PDP breakdown UI).
      const distribution: [number, number, number, number, number] = [
        0, 0, 0, 0, 0,
      ];
      for (const r of reviews) {
        if (r.rating >= 1 && r.rating <= 5) {
          distribution[5 - r.rating] += 1;
        }
      }

      let canReview = false;
      if (req.user) {
        const already = reviews.some((r) => r.buyerId === req.user!.id);
        if (!already) {
          canReview = await buyerCanReview(
            req.user.id,
            product.id,
            req.tenant!.tenantId
          );
        }
      }

      return res.json({
        summary: {
          average: Math.round(average * 10) / 10,
          count,
          distribution,
          reviews: reviews.map(toReviewPublic),
          canReview,
        },
      });
    } catch (err) {
      return next(err);
    }
  }
);

productReviewsRouter.post(
  "/",
  requireAuth,
  requireTenantFromSlugParam("slug"),
  async (req, res, next) => {
    try {
      const body = createSchema.parse(req.body);
      const product = await prisma.product.findFirst({
        where: tenantWhere(req.tenant!, {
          id: req.params.productId,
          status: "active" as const,
        }),
      });
      if (!product) {
        return res.status(404).json({ error: "Product not found" });
      }

      const eligible = await buyerCanReview(
        req.user!.id,
        product.id,
        req.tenant!.tenantId
      );
      if (!eligible) {
        return res.status(403).json({
          error: "Only buyers with a paid order for this product can review",
        });
      }

      const existing = await prisma.review.findUnique({
        where: {
          productId_buyerId: {
            productId: product.id,
            buyerId: req.user!.id,
          },
        },
      });
      if (existing) {
        return res.status(409).json({ error: "You already reviewed this product" });
      }

      const review = await prisma.review.create({
        data: {
          productId: product.id,
          buyerId: req.user!.id,
          rating: body.rating,
          comment: body.comment,
        },
        include: { buyer: { select: { email: true } } },
      });

      return res.status(201).json({ review: toReviewPublic(review) });
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ error: "Validation failed", details: err.flatten() });
      }
      return next(err);
    }
  }
);
