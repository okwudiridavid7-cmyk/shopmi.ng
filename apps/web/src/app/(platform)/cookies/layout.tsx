import type { ReactNode } from "react";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  title: "Cookie Policy",
  description:
    "How Shopmi.ng uses cookies and how to change your cookie preferences.",
  path: "/cookies",
});

export default function Layout({ children }: { children: ReactNode }) {
  return children;
}
