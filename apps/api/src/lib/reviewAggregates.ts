import { prisma } from "../db/prisma";

export async function attachReviewAggregates<T extends { id: string }>(
  products: T[]
): Promise<(T & { _reviewCount: number; _avgRating: number | null })[]> {
  if (products.length === 0) return [];
  const ids = products.map((p) => p.id);
  const groups = await prisma.review.groupBy({
    by: ["productId"],
    where: { productId: { in: ids } },
    _avg: { rating: true },
    _count: { _all: true },
  });
  const byId = new Map(
    groups.map((g) => [
      g.productId,
      {
        _reviewCount: g._count._all,
        _avgRating:
          g._avg.rating != null
            ? Math.round(g._avg.rating * 10) / 10
            : null,
      },
    ])
  );
  return products.map((p) => ({
    ...p,
    _reviewCount: byId.get(p.id)?._reviewCount ?? 0,
    _avgRating: byId.get(p.id)?._avgRating ?? null,
  }));
}
