import type { ReactNode } from "react";
import { ShopShell } from "@/components/shell/shop-shell";

export default function ShopLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: { slug: string };
}) {
  return <ShopShell slug={params.slug}>{children}</ShopShell>;
}
