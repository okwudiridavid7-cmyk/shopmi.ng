import type { ReactNode } from "react";
import type { Metadata } from "next";
import { buildPublicShopUrl } from "@/lib/shop-url";

export function generateMetadata({ params }: { params: { slug: string } }): Metadata {
  return {
    title: "Privacy policy",
    alternates: { canonical: `${buildPublicShopUrl(params.slug)}/privacy` },
  };
}

export default function Layout({ children }: { children: ReactNode }) {
  return children;
}
