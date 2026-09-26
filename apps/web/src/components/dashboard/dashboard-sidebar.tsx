"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import {
  ChevronDown,
  PanelLeftClose,
  PanelLeftOpen,
  Search,
  Store,
} from "lucide-react";
import { useEffect, useState } from "react";
import {
  isNavActive,
  isNavParentActive,
  navGroupsForMode,
  type DashboardMode,
  type NavItem,
} from "@/lib/dashboard-nav-config";
import { useSidebarPreference } from "@/hooks/use-sidebar-preference";
import { useSellerBranding } from "@/hooks/use-seller";
import { usePlatformBranding } from "@/hooks/use-branding";
import { SellerViewStoreButton } from "@/components/seller-view-store";
import { BrandMark } from "@/components/brand-mark";

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
  const billingEnabled =
    usePlatformBranding().data?.billingEnabled !== false;
  const groups = navGroupsForMode(mode).map((g) => ({
    ...g,
    items: g.items.filter(
      (item) =>
        billingEnabled ||
        (item.href !== "/seller/plan" && item.href !== "/admin/plans")
    ),
  })).filter((g) => g.items.length > 0);
  const { collapsed, toggleCollapsed, ready } = useSidebarPreference();
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const branding = useSellerBranding(mode === "seller");
  const isCollapsed = collapsed && ready;
  const admin = mode === "admin";

  useEffect(() => {
    const next: Record<string, boolean> = {};
    for (const group of groups) {
      for (const item of group.items) {
        if (item.children?.length && isNavParentActive(pathname, search, item)) {
          next[item.id] = true;
        }
      }
    }
    setExpanded((prev) => ({ ...prev, ...next }));
  }, [pathname, search, mode]); // eslint-disable-line react-hooks/exhaustive-deps

  function toggleExpand(id: string) {
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  const shopLogo =
    branding.data?.logoRectUrl || branding.data?.logoUrl || null;
  const shopName = branding.data?.shopName ?? "Your shop";

  const sidebarContent = (
    <div className="flex h-full min-h-0 flex-col">
      {mode === "seller" ? (
        <div
          className={`shrink-0 border-b border-border ${
            isCollapsed ? "px-2 py-3" : "px-4 py-4"
          }`}
        >
          {isCollapsed ? (
            <div className="flex justify-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/favicon.png"
                alt={shopName}
                className="h-8 w-8 rounded-md object-contain"
              />
            </div>
          ) : shopLogo ? (
            <div className="flex items-center gap-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={shopLogo}
                alt={shopName}
                className="h-10 max-w-[11rem] object-contain object-left"
              />
            </div>
          ) : (
            <div className="flex items-center gap-2.5">
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent-soft text-accent dark:text-accent-on-dark">
                <Store className="h-4 w-4" aria-hidden />
              </span>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-foreground">
                  {shopName}
                </p>
                <p className="truncate text-[11px] text-muted-foreground">
                  Seller dashboard
                </p>
              </div>
            </div>
          )}
        </div>
      ) : null}

      <div className={`shrink-0 border-b border-border ${admin ? "p-3" : "p-3"}`}>
        <button
          type="button"
          onClick={onOpenCommand}
          className={`flex w-full items-center gap-2 rounded-lg border border-border bg-shell-search px-3 py-2 text-sm text-muted-foreground transition hover:text-foreground ${
            isCollapsed ? "justify-center px-2" : ""
          }`}
          title="Search navigation (⌘K)"
        >
          <Search className="h-4 w-4 shrink-0" aria-hidden />
          {!isCollapsed && (
            <>
              <span className="flex-1 text-left">Search…</span>
              <kbd className="hidden items-center gap-0.5 rounded border border-border bg-card px-1.5 py-0.5 font-sans text-xs font-semibold leading-none text-muted-foreground sm:inline-flex">
                <span className="text-sm leading-none" aria-hidden>
                  ⌘
                </span>
                <span className="text-sm leading-none">K</span>
              </kbd>
            </>
          )}
        </button>
        {mode === "seller" && (
          <div className="mt-2">
            <SellerViewStoreButton collapsed={isCollapsed} />
          </div>
        )}
      </div>

      <nav
        className="min-h-0 flex-1 overflow-y-auto p-2"
        aria-label="Dashboard"
      >
        <div className="space-y-4">
          {groups.map((group) => (
            <div key={group.id}>
              {!isCollapsed && (
                <p className="mb-1.5 px-3 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                  {group.label}
                </p>
              )}
              <ul className="space-y-0.5">
                {group.items.map((item) => (
                  <SidebarNavItem
                    key={item.id}
                    item={item}
                    pathname={pathname}
                    search={search}
                    collapsed={isCollapsed}
                    expanded={!!expanded[item.id]}
                    admin={admin}
                    onToggleExpand={() => toggleExpand(item.id)}
                    onNavigate={onMobileClose}
                  />
                ))}
              </ul>
            </div>
          ))}
        </div>
      </nav>

      <div className="mt-auto shrink-0 border-t border-border">
        {mode === "seller" ? (
          <div
            className={`border-b border-border ${
              isCollapsed ? "px-2 py-3" : "px-4 py-4"
            }`}
          >
            {isCollapsed ? (
              <div className="flex justify-center" title="Powered by Shopmi.ng">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/favicon.png"
                  alt="Shopmi.ng"
                  className="h-6 w-6 object-contain"
                />
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                  Powered by
                </p>
                <BrandMark
                  href="/"
                  className="opacity-90 transition hover:opacity-100 [&_img]:h-6 [&_img]:sm:h-7"
                />
              </div>
            )}
          </div>
        ) : null}

        <div className="hidden p-2 lg:block">
          <button
            type="button"
            onClick={toggleCollapsed}
            className="flex w-full items-center justify-center gap-2 rounded-lg px-2 py-2 text-sm text-muted-foreground transition hover:bg-muted hover:text-foreground"
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {isCollapsed ? (
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
        className={`dashboard-sidebar fixed inset-y-0 left-0 z-50 flex h-dvh w-[min(100%,18rem)] flex-col border-r border-border bg-card shadow-sm motion-safe:transition-transform motion-safe:duration-200 motion-safe:ease-out lg:static lg:z-auto lg:h-full lg:shrink-0 lg:shadow-none ${
          mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        } ${
          isCollapsed ? "lg:w-[4.25rem]" : "lg:w-[16.5rem]"
        } motion-safe:lg:transition-[width]`}
        data-collapsed={isCollapsed ? "true" : "false"}
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
  admin,
  onToggleExpand,
  onNavigate,
}: {
  item: NavItem;
  pathname: string;
  search: string;
  collapsed: boolean;
  expanded: boolean;
  admin: boolean;
  onToggleExpand: () => void;
  onNavigate: () => void;
}) {
  const Icon = item.icon;
  const hasChildren = (item.children?.length ?? 0) > 0;
  const parentActive = isNavParentActive(pathname, search, item);
  const selfActive = isNavActive(pathname, search, item.href);

  const activeClass = admin
    ? "bg-accent-soft font-medium text-accent dark:text-accent-on-dark"
    : "bg-accent/15 font-medium text-accent";
  const idleClass = admin
    ? "text-muted-foreground hover:bg-shell-nav-hover hover:text-foreground"
    : "text-muted-foreground hover:bg-muted hover:text-foreground";

  if (hasChildren) {
    return (
      <li>
        <div className="flex items-stretch">
          <Link
            href={item.href}
            onClick={onNavigate}
            title={collapsed ? item.label : undefined}
            className={`flex min-w-0 flex-1 items-center gap-3 rounded-lg px-3 py-2 text-sm transition motion-safe:duration-150 ${
              parentActive ? activeClass : idleClass
            } ${collapsed ? "justify-center px-2" : ""}`}
          >
            <Icon
              className={`h-[1.125rem] w-[1.125rem] shrink-0 ${
                parentActive
                  ? admin
                    ? "text-accent dark:text-accent-on-dark"
                    : "text-accent"
                  : ""
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
              className="rounded-lg px-2 text-muted-foreground hover:bg-muted hover:text-foreground"
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
            className={`ml-4 space-y-1 overflow-hidden border-l border-border pl-2 motion-safe:transition-all motion-safe:duration-200 ${
              expanded ? "mt-1 max-h-96 opacity-100" : "max-h-0 opacity-0"
            }`}
          >
            {(item.children ?? []).map((child) => {
              const childActive = isNavActive(pathname, search, child.href);
              return (
                <li key={child.id}>
                  <Link
                    href={child.href}
                    onClick={onNavigate}
                    className={`block rounded-lg px-3 py-2 text-sm transition ${
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
        className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition motion-safe:duration-150 ${
          selfActive ? activeClass : idleClass
        } ${collapsed ? "justify-center px-2" : ""}`}
      >
        <Icon
          className={`h-[1.125rem] w-[1.125rem] shrink-0 ${
            selfActive
              ? admin
                ? "text-accent dark:text-accent-on-dark"
                : "text-accent"
              : ""
          }`}
          aria-hidden
        />
        {!collapsed && <span className="truncate">{item.label}</span>}
      </Link>
    </li>
  );
}
