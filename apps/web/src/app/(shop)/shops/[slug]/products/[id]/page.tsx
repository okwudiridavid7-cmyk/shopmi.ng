import type { Metadata } from "next";
import { ProductDetailClient } from "./product-detail-client";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";
const WEB_URL = process.env.NEXT_PUBLIC_WEB_URL ?? "http://localhost:3000";

type Props = { params: { slug: string; id: string } };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  try {
    const res = await fetch(
      `${API_URL}/api/shops/${params.slug}/products/${params.id}`,
      { next: { revalidate: 60 } }
    );
    if (!res.ok) {
      return { title: "Product · Vendors" };
    }
    const data = (await res.json()) as {
      product: {
        id: string;
        title: string;
        description: string;
        tenant?: { name: string } | null;
      };
    };
    const p = data.product;
    const url = `${WEB_URL}/shops/${params.slug}/products/${params.id}`;
    const ogImage = `${API_URL}/api/og/products/${p.id}`;
    return {
      title: `${p.title} · ${p.tenant?.name ?? "Vendors"}`,
      description: p.description.slice(0, 160),
      openGraph: {
        title: p.title,
        description: p.description.slice(0, 160),
        url,
        images: [{ url: ogImage, width: 1200, height: 630 }],
        type: "website",
      },
      twitter: {
        card: "summary_large_image",
        title: p.title,
        description: p.description.slice(0, 160),
        images: [ogImage],
      },
    };
  } catch {
    return { title: "Product · Vendors" };
  }
}

export default function ProductDetailPage({ params }: Props) {
  return <ProductDetailClient slug={params.slug} id={params.id} />;
}
