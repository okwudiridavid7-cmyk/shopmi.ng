import type { ReactNode } from "react";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  title: "Pricing: Plans for your online store",
  description:
    "Start with a free trial and pick a plan that fits your shop. Simple monthly pricing for Nigerian sellers, with Paystack checkout and your own shop link included.",
  path: "/pricing",
});

export default function Layout({ children }: { children: ReactNode }) {
  return children;
}
