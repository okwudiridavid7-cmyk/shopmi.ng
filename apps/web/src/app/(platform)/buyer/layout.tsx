import type { Metadata } from "next";
import { NO_INDEX } from "@/lib/seo";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";

export const metadata: Metadata = { title: "My account", ...NO_INDEX };

export default function BuyerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <DashboardShell mode="buyer">{children}</DashboardShell>;
}
