import type { MetadataRoute } from "next";
import { API_URL, SITE_URL } from "@/lib/seo";
import { buildPublicShopUrl } from "@/lib/shop-url";

export const revalidate = 3600;

const STATIC_ROUTES: { path: string; priority: number; changeFrequency: "daily" | "weekly" | "monthly" | "yearly" }[] = [
  { path: "/", priority: 1, changeFrequency: "daily" },
  { path: "/explore", priority: 0.9, changeFrequency: "daily" },
  { path: "/sellers", priority: 0.9, changeFrequency: "weekly" },
  { path: "/buyers", priority: 0.8, changeFrequency: "weekly" },
  { path: "/pricing", priority: 0.8, changeFrequency: "weekly" },
  { path: "/faq", priority: 0.5, changeFrequency: "monthly" },
  { path: "/contact", priority: 0.4, changeFrequency: "yearly" },
  { path: "/support", priority: 0.4, changeFrequency: "monthly" },
  { path: "/terms", priority: 0.2, changeFrequency: "yearly" },
  { path: "/privacy", priority: 0.2, changeFrequency: "yearly" },
  { path: "/cookies", priority: 0.2, changeFrequency: "yearly" },
];

type SitemapData = {
  shops: { slug: string; updatedAt: string }[];
  products: { id: string; shop: string; updatedAt: string }[];
};

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const entries: MetadataRoute.Sitemap = STATIC_ROUTES.map((r) => ({
    url: `${SITE_URL}${r.path === "/" ? "" : r.path}`,
    lastModified: now,
    changeFrequency: r.changeFrequency,
    priority: r.priority,
  }));

  try {
    const res = await fetch(`${API_URL}/api/catalog/sitemap`, { next: { revalidate: 3600 } });
    if (!res.ok) return entries;
    const data = (await res.json()) as SitemapData;
    for (const shop of data.shops) {
      entries.push({
        url: buildPublicShopUrl(shop.slug),
        lastModified: new Date(shop.updatedAt),
        changeFrequency: "weekly",
        priority: 0.7,
      });
    }
    for (const p of data.products) {
      entries.push({
        url: `${buildPublicShopUrl(p.shop)}/products/${p.id}`,
        lastModified: new Date(p.updatedAt),
        changeFrequency: "weekly",
        priority: 0.6,
      });
    }
  } catch {
    /* API down at build time: ship the static routes only. */
  }
  return entries;
}
