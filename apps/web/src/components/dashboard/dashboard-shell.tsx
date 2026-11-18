"use client";

import { Suspense, useState, type ReactNode } from "react";
import { Bell, ExternalLink, Menu } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { apiFetch } from "@/lib/api";
import { ThemeCycleToggle } from "@/components/theme-cycle-toggle";
import { UserAccountMenu } from "@/components/shell/user-account-menu";
import { useAuth } from "@/hooks/use-auth";
import type { DashboardMode } from "@/lib/dashboard-nav-config";
import { AuthGuard } from "@/components/auth-guard";
import { Pattern as DashboardSkeleton } from "@/components/ui/v-skeleton-8";
import { CommandPalette } from "./command-palette";
import { DashboardSidebar } from "./dashboard-sidebar";
import { useSellerPlan } from "@/hooks/use-seller";
import { TrustBadge } from "@/components/shell/trust-badge";

type Props = {
  mode: DashboardMode;
  children: ReactNode;
};

const MODE_ROLES: Record<DashboardMode, string[]> = {
  buyer: ["buyer", "super_admin"],
  seller: ["buyer", "seller", "tenant_admin", "super_admin"],
  admin: ["super_admin"],
};

function DashboardShellInner({ mode, children }: Props) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [commandOpen, setCommandOpen] = useState(false);
  const { isAuthenticated } = useAuth();
  const sellerPlan = useSellerPlan(mode === "seller" && isAuthenticated);
  const notifications = useQuery({
    queryKey: ["platform-notifications", "count"],
    queryFn: () => apiFetch<{ unreadCount: number }>("/api/notifications"),
    staleTime: 30_000,
    refetchInterval: 5 * 60_000,
    enabled: isAuthenticated,
  });

  return (
    <AuthGuard
      roles={MODE_ROLES[mode]}
      fallback={<DashboardSkeleton fill label="Loading dashboard" />}
    >
      <div
        data-shell={mode}
        className="flex h-full w-full flex-1 overflow-hidden"
      >
        <Suspense fallback={null}>
          <DashboardSidebar
            mode={mode}
            mobileOpen={mobileOpen}
            onMobileClose={() => setMobileOpen(false)}
            onOpenCommand={() => setCommandOpen(true)}
          />
        </Suspense>

        <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
          <header className="flex h-16 shrink-0 items-center justify-between gap-4 border-b border-border bg-card px-token-4 sm:px-token-6">
            <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              className="rounded-md p-token-2 text-muted-foreground hover:bg-muted hover:text-foreground lg:hidden"
              aria-label="Open menu"
            >
              <Menu className="h-5 w-5" />
            </button>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              {mode === "seller" && sellerPlan.data?.tenant && <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${sellerPlan.data.tenant.verifiedBadge ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300" : "bg-amber-500/10 text-amber-800 dark:text-amber-300"}`}><TrustBadge verified={sellerPlan.data.tenant.verifiedBadge} showUnverified size="sm" />{sellerPlan.data.tenant.verifiedBadge ? "Verified" : "Unverified"}</span>}
              {mode !== "admin" && <Link data-tour="marketplace-link" href="/explore" className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm font-medium text-foreground transition hover:bg-muted"><span className="hidden sm:inline">Visit marketplace</span><ExternalLink className="h-3.5 w-3.5" /></Link>}
              <ThemeCycleToggle />
              <Link href="/notifications" aria-label="Notifications" className="relative rounded-lg p-2 text-muted-foreground transition hover:bg-muted hover:text-foreground"><Bell className="h-5 w-5" />{(notifications.data?.unreadCount ?? 0) > 0 && <span className="absolute -right-1 -top-1 flex min-h-5 min-w-5 animate-pulse items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-bold text-white">{notifications.data!.unreadCount > 99 ? "99+" : notifications.data!.unreadCount}</span>}</Link>
              <UserAccountMenu />
            </div>
          </header>

          <main data-tour={mode === "buyer" ? "buyer-main" : undefined} className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden bg-dash-canvas px-token-4 py-token-6 sm:px-token-6 lg:px-token-8 lg:py-token-8 motion-safe:animate-page-enter">
            <div
              className={
                mode === "admin"
                  ? "mx-auto w-full max-w-6xl"
                  : "mx-auto w-full max-w-5xl"
              }
            >
              {children}
            </div>
          </main>
        </div>

        <CommandPalette
          mode={mode}
          open={commandOpen}
          onOpenChange={setCommandOpen}
        />
      </div>
    </AuthGuard>
  );
}

export function DashboardShell(props: Props) {
  return (
    <Suspense
      fallback={<DashboardSkeleton fill label="Loading dashboard" />}
    >
      <DashboardShellInner {...props} />
    </Suspense>
  );
}
