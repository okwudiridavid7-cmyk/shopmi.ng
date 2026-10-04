import type { ReactNode } from "react";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  title: "Frequently asked questions",
  description:
    "Answers about shopping, payments, delivery, opening a shop and plans on Shopmi.ng.",
  path: "/faq",
});

export default function Layout({ children }: { children: ReactNode }) {
  return children;
}
