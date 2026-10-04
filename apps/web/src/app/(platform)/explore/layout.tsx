import type { ReactNode } from "react";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  title: "Marketplace: Shop from independent Nigerian sellers",
  description:
    "Browse fashion, beauty, electronics, food and home goods from verified local shops across Nigeria. Compare prices, filter by location and pay securely with Paystack.",
  path: "/explore",
});

export default function Layout({ children }: { children: ReactNode }) {
  return children;
}
