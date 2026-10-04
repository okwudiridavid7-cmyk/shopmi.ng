import type { Metadata } from "next";
import { NO_INDEX } from "@/lib/seo";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";

export const metadata: Metadata = { title: "Admin", ...NO_INDEX };

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <DashboardShell mode="admin">{children}</DashboardShell>;
}
