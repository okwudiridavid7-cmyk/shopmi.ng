"use client";

import { Suspense, useState, type ReactNode } from "react";
import { Menu } from "lucide-react";
import type { DashboardMode } from "@/lib/dashboard-nav-config";
import { AuthGuard } from "@/components/auth-guard";
import { CommandPalette } from "./command-palette";
import { DashboardSidebar } from "./dashboard-sidebar";

type Props = {
  mode: DashboardMode;
  children: ReactNode;
};

const MODE_ROLES: Record<DashboardMode, string[]> = {
  buyer: ["buyer", "seller", "tenant_admin", "super_admin"],
  seller: ["seller", "tenant_admin", "super_admin"],
  admin: ["super_admin"],
};

function DashboardShellInner({ mode, children }: Props) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [commandOpen, setCommandOpen] = useState(false);

  return (
    <AuthGuard roles={MODE_ROLES[mode]}>
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
          <div className="flex shrink-0 items-center gap-token-3 border-b border-border bg-card/50 px-token-4 py-token-3 lg:hidden">
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              className="rounded-md p-token-2 text-muted-foreground hover:bg-muted hover:text-foreground"
              aria-label="Open menu"
            >
              <Menu className="h-5 w-5" />
            </button>
            <p className="text-sm font-medium text-foreground">Menu</p>
          </div>

          <main
            className={
              mode === "admin"
                ? "min-h-0 flex-1 overflow-y-auto overflow-x-hidden bg-background px-token-4 py-token-6 sm:px-token-6 lg:px-token-8 lg:py-token-8 motion-safe:animate-page-enter"
                : "min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-token-4 py-token-6 sm:px-token-6 lg:px-token-8 lg:py-token-8 motion-safe:animate-page-enter"
            }
          >
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
      fallback={
        <div className="flex h-full w-full flex-1 items-center justify-center">
          <p className="text-sm text-muted-foreground">Loading…</p>
        </div>
      }
    >
      <DashboardShellInner {...props} />
    </Suspense>
  );
}
