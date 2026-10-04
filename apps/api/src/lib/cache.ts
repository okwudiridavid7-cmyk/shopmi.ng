import type { Response } from "express";
import { getRedisConnection } from "../queue/connection";

/**
 * Read-through Redis cache. Redis errors fall through to a live load so the
 * cache can never take an endpoint down.
 */
export async function cached<T>(
  key: string,
  ttlSec: number,
  load: () => Promise<T>
): Promise<T> {
  const redis = getRedisConnection();
  try {
    const hit = await redis.get(key);
    if (hit) return JSON.parse(hit) as T;
  } catch {
    // miss / parse / redis error → load
  }
  const value = await load();
  try {
    await redis.set(key, JSON.stringify(value), "EX", ttlSec);
  } catch {
    // ignore write failures
  }
  return value;
}

export async function invalidateCache(...keys: string[]): Promise<void> {
  if (keys.length === 0) return;
  try {
    await getRedisConnection().del(...keys);
  } catch {
    // ignore
  }
}

/** Browser/CDN caching for anonymous, non-personalised GET responses. */
export function setPublicCache(res: Response, maxAgeSec: number, swrSec = maxAgeSec * 5): void {
  res.setHeader(
    "Cache-Control",
    `public, max-age=${maxAgeSec}, stale-while-revalidate=${swrSec}`
  );
}

export const CACHE_KEYS = {
  tenantsConfig: "cache:tenants:config:v1",
  categoriesFlat: "cache:catalog:categories:flat:v1",
  categoriesTree: "cache:catalog:categories:tree:v1",
  brands: "cache:catalog:brands:v1",
  locations: "cache:catalog:locations:v1",
  shops: (limit: number) => `cache:shops:list:${limit}:v1`,
  homepageBanners: "cache:catalog:homepage-banners:v1",
  sitemap: "cache:catalog:sitemap:v1",
} as const;
