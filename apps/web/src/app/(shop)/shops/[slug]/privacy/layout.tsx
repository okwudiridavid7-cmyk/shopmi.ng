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
    title: "Privacy policy",
    alternates: { canonical: `${buildPublicShopUrl(slug)}/privacy` },
  };
}

export default function Layout({ children }: { children: ReactNode }) {
  return children;
}
