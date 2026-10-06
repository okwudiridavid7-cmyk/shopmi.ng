import type { Metadata } from "next";
import { JsonLd } from "@/components/json-ld";
import { API_URL, SITE_NAME } from "@/lib/seo";
import { buildPublicShopUrl } from "@/lib/shop-url";
import { ProductDetailClient } from "./product-detail-client";

type Props = { params: Promise<{ slug: string; id: string }> };

type ProductMeta = {
  id: string;
  title: string;
  description: string;
  price: string | number;
  currency: string;
  stock?: number | null;
  images?: unknown;
  brandName?: string | null;
  tenant?: { name: string; slug: string } | null;
};

async function loadProduct(slug: string, id: string): Promise<ProductMeta | null> {
  try {
    const res = await fetch(`${API_URL}/api/shops/${encodeURIComponent(slug)}/products/${encodeURIComponent(id)}`, {
      next: { revalidate: 60 },
    });
    if (!res.ok) return null;
    return ((await res.json()) as { product: ProductMeta }).product;
  } catch {
    return null;
  }
}

function firstImage(images: unknown): string | null {
  if (!Array.isArray(images) || !images.length) return null;
  const first = images[0] as unknown;
  if (typeof first === "string") return first;
  if (first && typeof first === "object" && "url" in first) {
    const url = (first as { url?: unknown }).url;
    return typeof url === "string" ? url : null;
  }
  return null;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug, id } = await params;
  const p = await loadProduct(slug, id);
  if (!p) return { title: { absolute: `Product | ${SITE_NAME}` }, robots: { index: false } };
  const shopName = p.tenant?.name ?? SITE_NAME;
  const title = `${p.title} | ${shopName}`;
  const description = p.description.replace(/\s+/g, " ").trim().slice(0, 160);
  const url = `${buildPublicShopUrl(slug)}/products/${id}`;
  return {
    title: { absolute: title },
    description,
    alternates: { canonical: url },
    openGraph: {
      title,
      description,
      url,
      siteName: SITE_NAME,
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
  };
}

export default async function ProductDetailPage({ params }: Props) {
  const { slug, id } = await params;
  const p = await loadProduct(slug, id);
  const image = p ? firstImage(p.images) : null;
  const jsonLd = p
    ? {
        "@context": "https://schema.org",
        "@type": "Product",
        name: p.title,
        description: p.description.slice(0, 500),
        ...(image ? { image: [image] } : {}),
        ...(p.brandName ? { brand: { "@type": "Brand", name: p.brandName } } : {}),
        offers: {
          "@type": "Offer",
          url: `${buildPublicShopUrl(slug)}/products/${id}`,
          priceCurrency: p.currency || "NGN",
          price: String(p.price),
          availability:
            p.stock === 0
              ? "https://schema.org/OutOfStock"
              : "https://schema.org/InStock",
          seller: { "@type": "Organization", name: p.tenant?.name ?? SITE_NAME },
        },
      }
    : null;
  return (
    <>
      {jsonLd ? <JsonLd data={jsonLd} /> : null}
      <ProductDetailClient slug={slug} id={id} />
    </>
  );
}
