"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ChevronDown, Heart, Menu, Search, User, X } from "lucide-react";
import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { useAuth } from "@/hooks/use-auth";
import { firstNameFromUser } from "@/lib/auth-redirect";
import { useAuthTransition } from "@/stores/auth-transition";
import { Dropdown, type DropdownItem } from "@/components/ui/dropdown";
import { themeDropdownItems } from "@/components/theme-toggle";
import { CartNav } from "@/components/shell/cart-nav";
import { BrandMark } from "@/components/brand-mark";
import { ThemeCycleToggle } from "@/components/theme-cycle-toggle";
import { Input } from "@/components/ui/input";
import { useMarketplaceFilters, useUiStore } from "@/stores/ui";

function roleMenuItems(
  role: string,
  onLogout: () => void,
  setTheme: (v: string) => void
): DropdownItem[] {
  const items: DropdownItem[] = [];

  if (role === "buyer" || role === "seller" || role === "tenant_admin") {
    items.push({ id: "dashboard", label: "Dashboard", href: "/buyer" });
    items.push({ id: "orders", label: "My Orders", href: "/buyer/orders" });
    items.push({ id: "favorites", label: "Favorites", href: "/buyer/favorites" });
    items.push({ id: "account", label: "Account settings", href: "/buyer/account" });
  }
  if (role === "buyer") {
    items.push({
      id: "become-seller",
      label: "Become a seller",
      href: "/onboarding",
    });
  }
  if (
    role === "seller" ||
    role === "tenant_admin" ||
    role === "super_admin"
  ) {
    items.push({
      id: "seller",
      label: "Seller Dashboard",
      href: "/seller",
    });
  }
  if (role === "super_admin") {
    items.push({ id: "admin", label: "Admin", href: "/admin" });
  }

  items.push({ id: "sep-1", label: "", separator: true });
  items.push(...themeDropdownItems(setTheme));
  items.push({ id: "sep-2", label: "", separator: true });
  items.push({
    id: "logout",
    label: "Log out",
    danger: true,
    onSelect: onLogout,
  });

  return items;
}

const COMPANY_LINKS = [
  { href: "/about", label: "About Us" },
  { href: "/contact", label: "Contact Us" },
  { href: "/faq", label: "FAQs" },
] as const;

export function SiteHeader({
  onOpenFilters,
}: {
  onOpenFilters?: () => void;
}) {
  const { user, displayName, initials, logout } = useAuth();
  const show = useAuthTransition((s) => s.show);
  const { setTheme } = useTheme();
  const pathname = usePathname();
  const router = useRouter();
  const { filters, setFilter } = useMarketplaceFilters();
  const [q, setQ] = useState(filters.q);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [companyOpen, setCompanyOpen] = useState(false);
  const setNavDrawerOpen = useUiStore((s) => s.setNavDrawerOpen);

  useEffect(() => setQ(filters.q), [filters.q]);
  useEffect(() => setMobileOpen(false), [pathname]);

  async function onLogout() {
    const name = user ? firstNameFromUser(user.name, user.email) : null;
    await logout();
    show("sign-out", { name, nextHref: "/" });
  }

  function submitSearch(e: React.FormEvent) {
    e.preventDefault();
    setFilter("q", q.trim());
    if (pathname !== "/") router.push("/");
  }

  const isHome = pathname === "/";

  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/90 backdrop-blur">
      <div className="mx-auto flex h-16 w-full max-w-[100rem] items-center gap-token-3 px-token-4 sm:px-token-6">
        <button
          type="button"
          className="rounded-md p-token-2 text-foreground lg:hidden"
          aria-label={isHome && onOpenFilters ? "Open menu and filters" : "Open menu"}
          onClick={() => {
            if (isHome) setNavDrawerOpen(true);
            else setMobileOpen(true);
          }}
        >
          <Menu className="h-5 w-5" />
        </button>

        <BrandMark className="shrink-0" />

        <form
          onSubmit={submitSearch}
          className="relative mx-auto hidden min-w-0 max-w-xl flex-1 items-stretch lg:flex"
        >
          <div className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search products…"
              className="h-10 rounded-r-none border-r-0 bg-card pl-10"
              aria-label="Search products"
            />
          </div>
          <button
            type="submit"
            className="inline-flex h-10 shrink-0 items-center rounded-r-md bg-accent px-token-4 text-sm font-semibold text-accent-foreground shadow-sm transition hover:bg-accent-deep"
          >
            Search
          </button>
        </form>

        <nav className="ml-auto flex items-center gap-token-1 sm:gap-token-2">
          <div className="relative hidden lg:block">
            <button
              type="button"
              className="inline-flex items-center gap-1 rounded-md px-token-3 py-token-2 text-sm text-muted-foreground hover:text-foreground"
              onClick={() => setCompanyOpen((v) => !v)}
              aria-expanded={companyOpen}
            >
              Company <ChevronDown className="h-3.5 w-3.5" />
            </button>
            {companyOpen && (
              <div className="absolute right-0 z-50 mt-2 min-w-[11rem] rounded-md border border-border bg-card py-1 shadow-md">
                {COMPANY_LINKS.map((l) => (
                  <Link
                    key={l.href}
                    href={l.href}
                    className="block px-3 py-2 text-sm hover:bg-muted"
                    onClick={() => setCompanyOpen(false)}
                  >
                    {l.label}
                  </Link>
                ))}
              </div>
            )}
          </div>

          <ThemeCycleToggle className="hidden lg:inline-flex" />

          <Link
            href={user ? "/buyer/favorites" : "/login?next=/buyer/favorites"}
            aria-label="Favorites"
            className="rounded-md p-token-2 text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <Heart className="h-5 w-5" />
          </Link>

          <CartNav />

          {user ? (
            <Dropdown
              label="Account menu"
              align="right"
              trigger={
                <span className="flex items-center gap-token-2">
                  <span className="flex h-8 w-8 items-center justify-center rounded-md bg-accent text-xs font-semibold text-accent-foreground">
                    {initials}
                  </span>
                  <span className="hidden max-w-[8rem] truncate text-foreground sm:inline">
                    {displayName}
                  </span>
                </span>
              }
              items={roleMenuItems(user.role, () => void onLogout(), setTheme)}
            />
          ) : (
            <>
              <Link
                href="/login"
                aria-label="Sign in"
                className="rounded-md p-token-2 text-muted-foreground hover:bg-muted hover:text-foreground lg:hidden"
              >
                <User className="h-5 w-5" />
              </Link>
              <Link
                href="/login"
                className="hidden rounded-md px-token-3 py-token-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground lg:inline"
              >
                Sign in
              </Link>
              <Link
                href="/signup"
                className="hidden rounded-md bg-accent px-token-4 py-token-2 text-sm font-medium text-accent-foreground lg:inline"
              >
                Sign up
              </Link>
            </>
          )}
        </nav>
      </div>

      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-foreground/40"
            aria-label="Close menu"
            onClick={() => setMobileOpen(false)}
          />
          <div className="absolute inset-y-0 left-0 flex w-[min(100%,20rem)] flex-col bg-card shadow-lg">
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <p className="text-sm font-medium">Menu</p>
              <button type="button" onClick={() => setMobileOpen(false)} aria-label="Close">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="flex-1 space-y-1 overflow-y-auto p-4 text-sm">
              <Link href="/" className="block rounded-md px-3 py-2 hover:bg-muted">
                Marketplace
              </Link>
              {COMPANY_LINKS.map((l) => (
                <Link
                  key={l.href}
                  href={l.href}
                  className="block rounded-md px-3 py-2 hover:bg-muted"
                >
                  {l.label}
                </Link>
              ))}
              {!user && (
                <>
                  <Link href="/signup" className="block rounded-md px-3 py-2 hover:bg-muted">
                    Sign up
                  </Link>
                  <Link href="/onboarding" className="block rounded-md px-3 py-2 hover:bg-muted">
                    Sell
                  </Link>
                </>
              )}
              {user?.role === "buyer" && (
                <Link href="/onboarding" className="block rounded-md px-3 py-2 hover:bg-muted">
                  Become a seller
                </Link>
              )}
              <div className="pt-4">
                <p className="mb-2 px-3 text-xs uppercase tracking-wide text-muted-foreground">
                  Appearance
                </p>
                <ThemeCycleToggle />
              </div>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}

export function MobileMarketplaceSearch() {
  const { filters, setFilter } = useMarketplaceFilters();
  const [q, setQ] = useState(filters.q);
  const router = useRouter();
  const pathname = usePathname();
  useEffect(() => setQ(filters.q), [filters.q]);

  return (
    <form
      className="px-token-4 pb-token-8 pt-token-4 lg:hidden"
      onSubmit={(e) => {
        e.preventDefault();
        setFilter("q", q.trim());
        if (pathname !== "/") router.push("/");
      }}
    >
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search products…"
          className="h-11 bg-card pl-10"
          aria-label="Search products"
        />
      </div>
    </form>
  );
}
