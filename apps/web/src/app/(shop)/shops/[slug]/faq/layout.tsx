import type { ReactNode } from "react";
import type { Metadata } from "next";
import { buildPublicShopUrl } from "@/lib/shop-url";

export function generateMetadata({ params }: { params: { slug: string } }): Metadata {
  return {
    title: "FAQ",
    alternates: { canonical: `${buildPublicShopUrl(params.slug)}/faq` },
  };
}

export default function Layout({ children }: { children: ReactNode }) {
  return children;
}
