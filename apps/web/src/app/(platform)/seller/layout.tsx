import { DashboardShell } from "@/components/dashboard/dashboard-shell";

export default function SellerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <DashboardShell mode="seller">{children}</DashboardShell>;
}
