"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import { useTheme } from "next-themes";
import {
  Check,
  Gift,
  HelpCircle,
  LayoutDashboard,
  LogOut,
  Monitor,
  Moon,
  PenLine,
  Rocket,
  Settings,
  Store,
  Sun,
  User,
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { firstNameFromUser } from "@/lib/auth-redirect";
import { useAuthTransition } from "@/stores/auth-transition";
import { cn } from "@/lib/utils";

function roleLabel(role: string) {
  if (role === "super_admin") return "Administrator";
  if (role === "tenant_admin") return "Shop admin";
  if (role === "seller") return "Seller";
  return "Buyer";
}

function roleBadgeClass(role: string) {
  if (role === "super_admin")
    return "bg-emerald-500/15 text-emerald-800 dark:text-emerald-300";
  if (role === "seller" || role === "tenant_admin")
    return "bg-accent/15 text-accent-deep dark:text-accent-on-dark";
  return "bg-muted text-muted-foreground";
}

type Workspace = {
  id: string;
  label: string;
  href: string;
  active: boolean;
};

/**
 * World-class account dropdown — profile header, workspaces, links,
 * segmented theme control, logout.
 */
export function UserAccountMenu({
  align = "right",
}: {
  align?: "left" | "right";
}) {
  const { user, firstName, initials, logout } = useAuth();
  const show = useAuthTransition((s) => s.show);
  const { theme, setTheme, resolvedTheme } = useTheme();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const menuId = useId();

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  if (!user) return null;

  const displayName = firstName || user.name || "Account";
  const role = user.role;

  const workspaces: Workspace[] = [];
  if (
    role === "buyer" ||
    role === "seller" ||
    role === "tenant_admin" ||
    role === "super_admin"
  ) {
    workspaces.push({
      id: "buyer",
      label: "Buyer",
      href: "/buyer",
      active: pathname.startsWith("/buyer"),
    });
  }
  if (role === "seller" || role === "tenant_admin" || role === "super_admin") {
    workspaces.push({
      id: "seller",
      label: "Seller studio",
      href: "/seller",
      active: pathname.startsWith("/seller"),
    });
  }
  if (role === "super_admin") {
    workspaces.push({
      id: "admin",
      label: "Admin",
      href: "/admin",
      active: pathname.startsWith("/admin"),
    });
  }

  const settingsHref =
    role === "super_admin"
      ? "/admin/settings"
      : role === "seller" || role === "tenant_admin"
        ? "/seller/settings"
        : "/buyer/account";

  const profileHref =
    role === "super_admin"
      ? "/admin"
      : role === "seller" || role === "tenant_admin"
        ? "/seller"
        : "/buyer/account";

  async function onLogout() {
    setOpen(false);
    const name = firstNameFromUser(user?.name, user?.email);
    await logout();
    show("sign-out", { name, nextHref: "/" });
  }

  const activeTheme = mounted ? theme ?? "system" : "system";

  return (
    <div ref={rootRef} className="relative inline-block text-left">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        aria-label="Account menu"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 rounded-lg px-1.5 py-1 transition hover:bg-muted"
      >
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-accent text-xs font-semibold text-white">
          {initials}
        </span>
        <span className="hidden max-w-[8rem] truncate text-sm font-medium text-foreground sm:inline">
          {displayName}
        </span>
      </button>

      {open ? (
        <div
          id={menuId}
          role="menu"
          className={cn(
            "absolute z-50 mt-2 w-[17.5rem] overflow-hidden rounded-2xl border border-border bg-card shadow-lg",
            align === "right" ? "right-0" : "left-0"
          )}
        >
          {/* Header */}
          <div className="flex items-start gap-3 border-b border-border px-4 py-3.5">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent text-sm font-semibold text-white">
              {initials}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-foreground">
                {displayName}
              </p>
              <p className="truncate text-xs text-muted-foreground">
                {user.email}
              </p>
              <span
                className={cn(
                  "mt-1.5 inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold",
                  roleBadgeClass(role)
                )}
              >
                {roleLabel(role)}
              </span>
            </div>
            <Link
              href={settingsHref}
              onClick={() => setOpen(false)}
              className="rounded-md p-1.5 text-muted-foreground transition hover:bg-muted hover:text-foreground"
              aria-label="Settings"
            >
              <Settings className="h-4 w-4" />
            </Link>
          </div>

          {/* Workspaces */}
          {workspaces.length > 0 ? (
            <div className="border-b border-border px-2 py-2">
              <p className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                Workspaces
              </p>
              {workspaces.map((ws) => (
                <Link
                  key={ws.id}
                  href={ws.href}
                  role="menuitem"
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-2.5 rounded-xl px-2 py-2 text-sm transition hover:bg-muted"
                >
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-muted text-[10px] font-semibold text-foreground">
                    {ws.label.slice(0, 1)}
                  </span>
                  <span className="min-w-0 flex-1 truncate font-medium text-foreground">
                    {ws.label}
                  </span>
                  {ws.active ? (
                    <Check
                      className="h-4 w-4 shrink-0 text-accent dark:text-accent-on-dark"
                      aria-hidden
                    />
                  ) : null}
                </Link>
              ))}
            </div>
          ) : null}

          {/* Links */}
          <div className="border-b border-border px-2 py-1.5">
            <MenuRow
              href={profileHref}
              icon={User}
              label="Profile"
              onClick={() => setOpen(false)}
            />
            <MenuRow
              href={settingsHref}
              icon={Settings}
              label="Account settings"
              onClick={() => setOpen(false)}
            />
            <MenuRow
              href="/support"
              icon={HelpCircle}
              label="Help & Support"
              onClick={() => setOpen(false)}
            />
            {(role === "seller" || role === "tenant_admin") && (
              <MenuRow
                href="/seller"
                icon={PenLine}
                label="Seller studio"
                onClick={() => setOpen(false)}
              />
            )}
            {role === "buyer" && (
              <MenuRow
                href="/onboarding"
                icon={Store}
                label="Become a seller"
                onClick={() => setOpen(false)}
              />
            )}
            {role === "super_admin" && (
              <MenuRow
                href="/admin"
                icon={LayoutDashboard}
                label="Admin console"
                onClick={() => setOpen(false)}
              />
            )}
          </div>

          <div className="border-b border-border px-2 py-1.5">
            <MenuRow
              href="/about"
              icon={Rocket}
              label="What's new"
              onClick={() => setOpen(false)}
              badge={1}
            />
            <MenuRow
              href="/contact"
              icon={Gift}
              label="Refer a shop"
              onClick={() => setOpen(false)}
            />
          </div>

          {/* Theme segmented */}
          <div className="border-b border-border px-3 py-3">
            <div className="grid grid-cols-3 gap-1 rounded-xl bg-muted p-1">
              {(
                [
                  { id: "light", label: "Light", icon: Sun },
                  { id: "dark", label: "Dark", icon: Moon },
                  { id: "system", label: "System", icon: Monitor },
                ] as const
              ).map((opt) => {
                const Icon = opt.icon;
                const active = activeTheme === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setTheme(opt.id)}
                    className={cn(
                      "flex flex-col items-center gap-0.5 rounded-lg px-2 py-2 text-[10px] font-medium transition",
                      active
                        ? "bg-card text-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                    aria-pressed={active}
                    title={
                      opt.id === "system"
                        ? `System (${resolvedTheme ?? "…"})`
                        : opt.label
                    }
                  >
                    <Icon className="h-3.5 w-3.5" aria-hidden />
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Logout */}
          <div className="px-2 py-1.5">
            <button
              type="button"
              role="menuitem"
              onClick={() => void onLogout()}
              className="flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2.5 text-sm font-medium text-danger transition hover:bg-danger/10"
            >
              <LogOut className="h-4 w-4" aria-hidden />
              Log out
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function MenuRow({
  href,
  icon: Icon,
  label,
  onClick,
  badge,
}: {
  href: string;
  icon: typeof User;
  label: string;
  onClick: () => void;
  badge?: number;
}) {
  return (
    <Link
      href={href}
      role="menuitem"
      onClick={onClick}
      className="flex items-center gap-2.5 rounded-xl px-2.5 py-2.5 text-sm text-foreground transition hover:bg-muted"
    >
      <Icon className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
      <span className="min-w-0 flex-1 truncate">{label}</span>
      {badge != null ? (
        <span className="inline-flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-emerald-700 px-1.5 text-[10px] font-semibold text-white">
          {badge}
        </span>
      ) : null}
    </Link>
  );
}
