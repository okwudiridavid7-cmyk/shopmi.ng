import type { ReactNode } from "react";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  title: "Privacy Policy",
  description:
    "How Shopmi.ng collects, uses and protects your personal information.",
  path: "/privacy",
});

export default function Layout({ children }: { children: ReactNode }) {
  return children;
}
