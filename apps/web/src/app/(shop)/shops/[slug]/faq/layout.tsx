import type { ReactNode } from "react";
import type { Metadata } from "next";
import { buildPublicShopUrl } from "@/lib/shop-url";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  return {
    title: "FAQ",
    alternates: { canonical: `${buildPublicShopUrl(slug)}/faq` },
  };
}

export default function Layout({ children }: { children: ReactNode }) {
  return children;
}
