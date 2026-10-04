import type { ReactNode } from "react";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  title: "Terms of Service",
  description:
    "The terms that govern buying and selling on Shopmi.ng and the shops it hosts.",
  path: "/terms",
});

export default function Layout({ children }: { children: ReactNode }) {
  return children;
}
