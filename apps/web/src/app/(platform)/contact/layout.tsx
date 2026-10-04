import type { ReactNode } from "react";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  title: "Contact us",
  description:
    "Questions about buying or selling on Shopmi.ng? Send us a message and our team will get back to you.",
  path: "/contact",
});

export default function Layout({ children }: { children: ReactNode }) {
  return children;
}
