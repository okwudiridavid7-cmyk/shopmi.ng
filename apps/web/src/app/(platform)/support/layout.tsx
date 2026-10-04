import type { ReactNode } from "react";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  title: "Help and support",
  description:
    "Get help with orders, payments, your account or your online store on Shopmi.ng.",
  path: "/support",
});

export default function Layout({ children }: { children: ReactNode }) {
  return children;
}
