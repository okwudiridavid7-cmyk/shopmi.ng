import type { ReactNode } from "react";
import type { Metadata } from "next";
import { NO_INDEX } from "@/lib/seo";

export const metadata: Metadata = { title: "Sign in", ...NO_INDEX };

export default function Layout({ children }: { children: ReactNode }) {
  return children;
}
