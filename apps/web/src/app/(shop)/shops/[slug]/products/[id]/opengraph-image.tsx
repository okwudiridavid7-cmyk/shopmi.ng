import { OG_SIZE, renderOgCard } from "@/lib/og";
import { API_URL } from "@/lib/seo";
import { formatMoney } from "@/lib/api";

export const runtime = "nodejs";
export const alt = "Product on Shopmi.ng";
export const size = OG_SIZE;
export const contentType = "image/png";
export const revalidate = 3600;

type Product = {
  title: string;
  price: string | number;
  currency: string;
  images?: unknown;
  tenant?: { name: string; slug: string } | null;
};

function firstImage(images: unknown): string | null {
  if (!Array.isArray(images)) return null;
  const first = images[0] as unknown;
  if (typeof first === "string") return first;
  if (first && typeof first === "object" && typeof (first as { url?: unknown }).url === "string") {
    return (first as { url: string }).url;
  }
  return null;
}

export default async function Image({
  params,
}: {
  params: Promise<{ slug: string; id: string }>;
}) {
  const { slug, id } = await params;
  const res = await fetch(
    `${API_URL}/api/shops/${encodeURIComponent(slug)}/products/${encodeURIComponent(id)}`
  ).catch(() => null);
  const product = res?.ok ? ((await res.json()) as { product: Product }).product : null;
  if (!product) {
    return renderOgCard({
      eyebrow: "Product",
      title: "Shop on Shopmi.ng",
      subtitle: "Independent Nigerian brands, one secure checkout.",
      screenshot: "og/marketplace.jpg",
    });
  }
  return renderOgCard({
    eyebrow: formatMoney(Number(product.price), product.currency),
    title: product.title.length > 60 ? `${product.title.slice(0, 57)}...` : product.title,
    subtitle: `Sold by ${product.tenant?.name ?? "an independent shop"}. Pay securely with Paystack.`,
    imageUrl: firstImage(product.images),
    footer: `shopmi.ng/shops/${slug}`,
  });
}
