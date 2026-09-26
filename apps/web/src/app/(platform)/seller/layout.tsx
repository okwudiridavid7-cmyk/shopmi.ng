import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { SellerTenantGate } from "@/components/dashboard/seller-tenant-gate";

export default function SellerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <DashboardShell mode="seller">
      <SellerTenantGate>{children}</SellerTenantGate>
    </DashboardShell>
  );
}
