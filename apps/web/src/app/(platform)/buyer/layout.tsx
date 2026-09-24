import { DashboardShell } from "@/components/dashboard/dashboard-shell";

export default function BuyerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <DashboardShell mode="buyer">{children}</DashboardShell>;
}
