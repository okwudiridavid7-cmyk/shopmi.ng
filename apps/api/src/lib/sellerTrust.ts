import type { SellerTrustPublic } from "@vendors/shared-types";
import { prisma } from "../db/prisma";

/**
 * Quality % / Delivery % gating threshold.
 * Hide these computed performance metrics until a shop has this many
 * completed (paid|fulfilled) orders — empty % reads as a negative trust signal.
 * Adjust later if real seller data shows 10 is too high or low.
 */
export const SELLER_TRUST_PERF_MIN_ORDERS = 10;

function logoFromTheme(theme: unknown): string | null {
  if (!theme || typeof theme !== "object") return null;
  const logo = (theme as Record<string, unknown>).logoUrl;
  return typeof logo === "string" && logo.trim() ? logo.trim() : null;
}

export async function getSellerTrust(
  tenantId: string
): Promise<SellerTrustPublic | null> {
  const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
  if (!tenant) return null;

  const completedStatuses = ["paid", "fulfilled"] as const;

  const [ordersCompletedCount, fulfilledCount, reviewAgg] = await Promise.all([
    prisma.order.count({
      where: { tenantId, status: { in: [...completedStatuses] } },
    }),
    prisma.order.count({
      where: { tenantId, status: "fulfilled" },
    }),
    prisma.review.aggregate({
      where: { product: { tenantId } },
      _avg: { rating: true },
      _count: { _all: true },
    }),
  ]);

  const yearsOnPlatform = Math.max(
    0,
    Math.floor(
      (Date.now() - tenant.createdAt.getTime()) / (365.25 * 24 * 60 * 60 * 1000)
    )
  );

  const reviewCount = reviewAgg._count._all;
  const avgRating =
    reviewCount > 0 && reviewAgg._avg.rating != null
      ? Math.round(reviewAgg._avg.rating * 10) / 10
      : null;

  let qualityPercent: number | null = null;
  let deliveryPercent: number | null = null;

  // Only expose performance % once we have enough completed-order signal.
  if (ordersCompletedCount >= SELLER_TRUST_PERF_MIN_ORDERS) {
    // Quality: average star rating scaled to 0–100.
    if (avgRating != null) {
      qualityPercent = Math.round((avgRating / 5) * 100);
    }
    // Delivery: share of completed orders that reached fulfilled.
    deliveryPercent = Math.round(
      (fulfilledCount / ordersCompletedCount) * 100
    );
  }

  return {
    shopName: tenant.name,
    shopSlug: tenant.slug,
    verifiedBadge: tenant.verifiedBadge,
    logoUrl: logoFromTheme(tenant.themeSettings),
    yearsOnPlatform,
    ordersCompletedCount,
    salesCount: ordersCompletedCount,
    reviewCount,
    avgRating,
    qualityPercent,
    deliveryPercent,
  };
}
