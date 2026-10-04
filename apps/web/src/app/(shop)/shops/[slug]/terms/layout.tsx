import type { ReactNode } from "react";
import type { Metadata } from "next";
import { buildPublicShopUrl } from "@/lib/shop-url";

export function generateMetadata({ params }: { params: { slug: string } }): Metadata {
  return {
    title: "Terms",
    alternates: { canonical: `${buildPublicShopUrl(params.slug)}/terms` },
  };
}

export default function Layout({ children }: { children: ReactNode }) {
  return children;
}
