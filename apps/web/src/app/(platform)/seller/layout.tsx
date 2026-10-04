import type { Metadata } from "next";
import { NO_INDEX } from "@/lib/seo";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { SellerTenantGate } from "@/components/dashboard/seller-tenant-gate";

export const metadata: Metadata = { title: "Seller dashboard", ...NO_INDEX };

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
