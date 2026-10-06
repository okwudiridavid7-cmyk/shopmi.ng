import type { ProductPublic, TenantPublic } from "@vendors/shared-types";
import { OG_SIZE, renderOgCard } from "@/lib/og";
import { API_URL } from "@/lib/seo";
import { parseThemeSettings } from "@/lib/theme";

export const runtime = "nodejs";
export const alt = "Shop on Shopmi.ng";
export const size = OG_SIZE;
export const contentType = "image/png";
export const revalidate = 3600;

function firstImage(images: unknown): string | null {
  if (!Array.isArray(images)) return null;
  const first = images[0] as unknown;
  if (typeof first === "string") return first;
  if (first && typeof first === "object" && typeof (first as { url?: unknown }).url === "string") {
    return (first as { url: string }).url;
  }
  return null;
}

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const slug = encodeURIComponent((await params).slug);
  const [shopRes, productsRes] = await Promise.all([
    fetch(`${API_URL}/api/shops/${slug}`).catch(() => null),
    fetch(`${API_URL}/api/shops/${slug}/products?limit=1&page=1`).catch(() => null),
  ]);
  const tenant = shopRes?.ok ? ((await shopRes.json()) as { tenant: TenantPublic }).tenant : null;
  const products = productsRes?.ok
    ? ((await productsRes.json()) as { products: ProductPublic[] }).products
    : [];
  if (!tenant) {
    return renderOgCard({
      eyebrow: "Shop",
      title: "Shop on Shopmi.ng",
      subtitle: "Independent Nigerian brands, one secure checkout.",
      screenshot: "og/marketplace.jpg",
    });
  }
  const theme = parseThemeSettings(tenant.themeSettings);
  const blurb = theme.shopDescription?.trim();
  return renderOgCard({
    eyebrow: tenant.verifiedBadge ? "Verified shop" : "Shop",
    title: tenant.name,
    subtitle:
      blurb && blurb.length <= 110
        ? blurb
        : `${tenant.location ? `Based in ${tenant.location}. ` : ""}Browse products and pay securely with Paystack.`,
    imageUrl: firstImage(products[0]?.images),
    footer: `shopmi.ng/shops/${tenant.slug}`,
  });
}
