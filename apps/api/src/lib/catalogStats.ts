import type IORedis from "ioredis";
import { prisma } from "../db/prisma";
import { getRedisConnection } from "../queue/connection";

export type CatalogStats = {
  shopCount: number;
  productCount: number;
  orderCount: number;
};

export const CATALOG_STATS_CACHE_KEY = "catalog:stats:v1";
/** Slightly stale marketing counts are fine (REM-13: 60–300s). */
export const CATALOG_STATS_TTL_SEC = 120;

async function loadCatalogStatsFromDb(): Promise<CatalogStats> {
  const [shopCount, productCount, orderCount] = await Promise.all([
    prisma.tenant.count({
      where: { status: { not: "suspended" } },
    }),
    prisma.product.count({
      where: {
        status: "active",
        tenant: { status: { not: "suspended" } },
      },
    }),
    prisma.order.count({
      where: { status: { in: ["paid", "fulfilled"] } },
    }),
  ]);
  return { shopCount, productCount, orderCount };
}

export type CatalogStatsDeps = {
  redis?: Pick<IORedis, "get" | "set">;
  load?: () => Promise<CatalogStats>;
  ttlSec?: number;
};

/**
 * Marketplace totals for About / marketing, cached in Redis (REM-13).
 * Cache failures fall through to a live DB load.
 */
export async function getCatalogStats(
  deps?: CatalogStatsDeps
): Promise<CatalogStats> {
  const redis = deps?.redis ?? getRedisConnection();
  const load = deps?.load ?? loadCatalogStatsFromDb;
  const ttl = deps?.ttlSec ?? CATALOG_STATS_TTL_SEC;

  try {
    const cached = await redis.get(CATALOG_STATS_CACHE_KEY);
    if (cached) {
      const parsed = JSON.parse(cached) as CatalogStats;
      if (
        typeof parsed?.shopCount === "number" &&
        typeof parsed?.productCount === "number" &&
        typeof parsed?.orderCount === "number"
      ) {
        return parsed;
      }
    }
  } catch {
    // miss / parse / redis error → load
  }

  const stats = await load();

  try {
    await redis.set(
      CATALOG_STATS_CACHE_KEY,
      JSON.stringify(stats),
      "EX",
      ttl
    );
  } catch {
    // ignore write failures
  }

  return stats;
}
