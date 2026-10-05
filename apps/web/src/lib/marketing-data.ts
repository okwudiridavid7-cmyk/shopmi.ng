import type { CategoryPublic, PlanPublic, ProductPublic, TenantPublic } from "@vendors/shared-types";
import { API_URL } from "@/lib/seo";
import { parsePalette, type Palette } from "@/lib/palette";

async function get<T>(path: string, revalidate: number): Promise<T | null> {
  try {
    const res = await fetch(`${API_URL}${path}`, { next: { revalidate } });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

export const PLATFORM_CONFIG_TAG = "platform-config";

/** Admin-chosen site palette. Short timeout: every page renders through this, so a slow API must not block it. */
export async function getPalette(): Promise<Palette | null> {
  try {
    const res = await fetch(`${API_URL}/api/tenants/config`, {
      next: { revalidate: 60, tags: [PLATFORM_CONFIG_TAG] },
      signal: AbortSignal.timeout(2500),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { palette?: unknown };
    return parsePalette(data.palette ?? null);
  } catch {
    return null;
  }
}

export async function getPlans(): Promise<{ billingEnabled: boolean; plans: PlanPublic[] }> {
  const data = await get<{ billingEnabled?: boolean; plans?: PlanPublic[] }>("/api/plans", 300);
  return { billingEnabled: data?.billingEnabled !== false, plans: data?.plans ?? [] };
}

export async function getTopCategories(limit = 12): Promise<CategoryPublic[]> {
  const data = await get<{ categories: CategoryPublic[] }>("/api/catalog/categories?tree=1", 300);
  return (data?.categories ?? []).filter((c) => !c.parentId).slice(0, limit);
}

export type CatalogStats = { shopCount: number; productCount: number; orderCount: number };

export async function getCatalogStats(): Promise<CatalogStats | null> {
  const data = await get<{ stats: CatalogStats }>("/api/catalog/stats", 300);
  return data?.stats ?? null;
}

export async function getLatestProducts(limit = 8): Promise<ProductPublic[]> {
  const data = await get<{ products: ProductPublic[] }>(
    `/api/catalog/products?page=1&limit=${limit}&sort=newest`,
    120
  );
  return data?.products ?? [];
}

export async function getShops(limit = 24): Promise<(TenantPublic & { productCount: number })[]> {
  const data = await get<{ shops: (TenantPublic & { productCount: number })[] }>(
    `/api/shops?limit=${limit}`,
    120
  );
  return data?.shops ?? [];
}

/** Cheapest plan with a price above zero, for "from ₦X/month" copy. */
export function cheapestPaidPlan(plans: PlanPublic[]): PlanPublic | null {
  const paid = plans.filter((p) => Number(p.price) > 0);
  if (!paid.length) return null;
  return paid.reduce((min, p) => (Number(p.price) < Number(min.price) ? p : min));
}

export function hasFreePlan(plans: PlanPublic[]): boolean {
  return plans.some((p) => Number(p.price) === 0);
}

export function nairaWhole(amount: number): string {
  return `₦${Math.round(amount).toLocaleString("en-NG")}`;
}
