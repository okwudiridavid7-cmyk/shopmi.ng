"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { ChevronDown, PanelLeftClose, PanelLeftOpen, Search } from "lucide-react";
import { useEffect, useState } from "react";
import {
  isNavActive,
  isNavParentActive,
  navForMode,
  type DashboardMode,
  type NavItem,
} from "@/lib/dashboard-nav-config";
import { useSidebarPreference } from "@/hooks/use-sidebar-preference";
import { SellerViewStoreButton } from "@/components/seller-view-store";

type SidebarProps = {
  mode: DashboardMode;
  mobileOpen: boolean;
  onMobileClose: () => void;
  onOpenCommand: () => void;
};

export function DashboardSidebar({
  mode,
  mobileOpen,
  onMobileClose,
  onOpenCommand,
}: SidebarProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const search = searchParams.toString();
  const items = navForMode(mode);
  const { collapsed, toggleCollapsed, ready } = useSidebarPreference();
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const next: Record<string, boolean> = {};
    for (const item of items) {
      if (item.children?.length && isNavParentActive(pathname, search, item)) {
        next[item.id] = true;
      }
    }
    setExpanded((prev) => ({ ...prev, ...next }));
  }, [pathname, search, items]);

  function toggleExpand(id: string) {
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  const sidebarContent = (
    <div className="flex h-full flex-col">
      <div className="border-b border-border p-token-3">
        <button
          type="button"
          onClick={onOpenCommand}
          className={`flex w-full items-center gap-token-2 rounded-md border border-border bg-muted/40 px-token-3 py-token-2 text-sm text-muted-foreground transition hover:bg-muted hover:text-foreground ${
            collapsed && ready ? "justify-center px-token-2" : ""
          }`}
          title="Search navigation (⌘K)"
        >
          <Search className="h-4 w-4 shrink-0" aria-hidden />
          {(!collapsed || !ready) && (
            <>
              <span className="flex-1 text-left">Search…</span>
              <kbd className="hidden rounded border border-border bg-card px-1.5 py-0.5 text-[10px] font-medium sm:inline">
                ⌘K
              </kbd>
            </>
          )}
        </button>
        {mode === "seller" && (
          <div className="mt-token-2">
            <SellerViewStoreButton collapsed={collapsed && ready} />
          </div>
        )}
      </div>

      <nav className="flex-1 overflow-y-auto p-token-2" aria-label="Dashboard">
        <ul className="space-y-token-1">
          {items.map((item) => (
            <SidebarNavItem
              key={item.id}
              item={item}
              pathname={pathname}
              search={search}
              collapsed={collapsed && ready}
              expanded={!!expanded[item.id]}
              onToggleExpand={() => toggleExpand(item.id)}
              onNavigate={onMobileClose}
            />
          ))}
        </ul>
      </nav>

      <div className="hidden border-t border-border p-token-2 lg:block">
        <button
          type="button"
          onClick={toggleCollapsed}
          className="flex w-full items-center justify-center gap-token-2 rounded-md px-token-2 py-token-2 text-sm text-muted-foreground transition hover:bg-muted hover:text-foreground"
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? (
            <PanelLeftOpen className="h-4 w-4" />
          ) : (
            <>
              <PanelLeftClose className="h-4 w-4" />
              <span>Collapse</span>
            </>
          )}
        </button>
      </div>
    </div>
  );

  return (
    <>
      {mobileOpen && (
        <button
          type="button"
          className="fixed inset-0 z-40 bg-foreground/25 lg:hidden"
          aria-label="Close menu"
          onClick={onMobileClose}
        />
      )}

      <aside
        className={`dashboard-sidebar fixed inset-y-0 left-0 z-50 flex w-[min(100%,18rem)] flex-col border-r border-border bg-card shadow-lg motion-safe:transition-transform motion-safe:duration-200 motion-safe:ease-out lg:static lg:z-auto lg:shadow-none ${
          mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        } ${
          collapsed && ready
            ? "lg:w-[4.25rem]"
            : "lg:w-[16.5rem]"
        } motion-safe:lg:transition-[width]`}
        data-collapsed={collapsed && ready ? "true" : "false"}
      >
        {sidebarContent}
      </aside>
    </>
  );
}

function SidebarNavItem({
  item,
  pathname,
  search,
  collapsed,
  expanded,
  onToggleExpand,
  onNavigate,
}: {
  item: NavItem;
  pathname: string;
  search: string;
  collapsed: boolean;
  expanded: boolean;
  onToggleExpand: () => void;
  onNavigate: () => void;
}) {
  const Icon = item.icon;
  const hasChildren = (item.children?.length ?? 0) > 0;
  const parentActive = isNavParentActive(pathname, search, item);
  const selfActive = isNavActive(pathname, search, item.href);

  if (hasChildren) {
    return (
      <li>
        <div className="flex items-stretch">
          <Link
            href={item.href}
            onClick={onNavigate}
            title={collapsed ? item.label : undefined}
            className={`flex min-w-0 flex-1 items-center gap-token-3 rounded-md px-token-3 py-token-2 text-sm transition motion-safe:duration-150 ${
              parentActive
                ? "bg-accent/15 font-medium text-accent"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            } ${collapsed ? "justify-center px-token-2" : ""}`}
          >
            <Icon
              className={`h-[1.125rem] w-[1.125rem] shrink-0 ${
                parentActive ? "text-accent" : ""
              }`}
              aria-hidden
            />
            {!collapsed && <span className="truncate">{item.label}</span>}
          </Link>
          {!collapsed && (
            <button
              type="button"
              onClick={onToggleExpand}
              aria-expanded={expanded}
              aria-label={`${expanded ? "Collapse" : "Expand"} ${item.label} menu`}
              className="rounded-md px-token-2 text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              <ChevronDown
                className={`h-4 w-4 motion-safe:transition-transform motion-safe:duration-200 ${
                  expanded ? "rotate-180" : ""
                }`}
              />
            </button>
          )}
        </div>
        {!collapsed && (
          <ul
            className={`ml-token-4 space-y-token-1 overflow-hidden border-l border-border pl-token-2 motion-safe:transition-all motion-safe:duration-200 ${
              expanded ? "mt-token-1 max-h-96 opacity-100" : "max-h-0 opacity-0"
            }`}
          >
            {(item.children ?? []).map((child) => {
              const childActive = isNavActive(pathname, search, child.href);
              return (
                <li key={child.id}>
                  <Link
                    href={child.href}
                    onClick={onNavigate}
                    className={`block rounded-md px-token-3 py-token-2 text-sm transition ${
                      childActive
                        ? "bg-accent/15 font-medium text-accent"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    }`}
                  >
                    {child.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </li>
    );
  }

  return (
    <li>
      <Link
        href={item.href}
        onClick={onNavigate}
        title={collapsed ? item.label : undefined}
        className={`flex items-center gap-token-3 rounded-md px-token-3 py-token-2 text-sm transition motion-safe:duration-150 ${
          selfActive
            ? "bg-accent/15 font-medium text-accent"
            : "text-muted-foreground hover:bg-muted hover:text-foreground"
        } ${collapsed ? "justify-center px-token-2" : ""}`}
      >
        <Icon
          className={`h-[1.125rem] w-[1.125rem] shrink-0 ${
            selfActive ? "text-accent" : ""
          }`}
          aria-hidden
        />
        {!collapsed && <span className="truncate">{item.label}</span>}
      </Link>
    </li>
  );
}
