"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  ChevronDown,
  CircleHelp,
  Heart,
  LayoutDashboard,
  Mail,
  Menu,
  Moon,
  Search,
  Store,
  Sun,
  Tag,
  User,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { useAuth } from "@/hooks/use-auth";
import { useSellerBranding } from "@/hooks/use-seller";
import { CartNav } from "@/components/shell/cart-nav";
import { UserAccountMenu } from "@/components/shell/user-account-menu";
import { BrandMark } from "@/components/brand-mark";
import { ThemeCycleToggle } from "@/components/theme-cycle-toggle";
import { Input } from "@/components/ui/input";
import { useMarketplaceFilters, useUiStore } from "@/stores/ui";
import { usePlatformBranding } from "@/hooks/use-branding";
import { cn } from "@/lib/utils";

const COMPANY_LINKS = [
  { href: "/about", label: "About Us", icon: Store },
  { href: "/pricing", label: "Pricing", icon: Tag },
  { href: "/contact", label: "Contact Us", icon: Mail },
  { href: "/faq", label: "FAQs", icon: CircleHelp },
] as const;

export function SiteHeader({
  onOpenFilters,
}: {
  onOpenFilters?: () => void;
}) {
  const { user } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const { filters, setFilter } = useMarketplaceFilters();
  const [q, setQ] = useState(filters.q);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [companyOpen, setCompanyOpen] = useState(false);
  const setNavDrawerOpen = useUiStore((s) => s.setNavDrawerOpen);
  const billingEnabled =
    usePlatformBranding().data?.billingEnabled !== false;
  const companyLinks = COMPANY_LINKS.filter(
    (l) => billingEnabled || l.href !== "/pricing"
  );

  useEffect(() => setQ(filters.q), [filters.q]);
  useEffect(() => setMobileOpen(false), [pathname]);
  useEffect(() => {
    if (!mobileOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [mobileOpen]);

  function submitSearch(e: React.FormEvent) {
    e.preventDefault();
    setFilter("q", q.trim());
    if (pathname !== "/explore") router.push("/explore");
  }

  const isExplore = pathname === "/explore";
  const isAdmin = pathname.startsWith("/admin");
  const isSellerDash = pathname.startsWith("/seller");
  const sellerBranding = useSellerBranding(isSellerDash);
  const shopLogo =
    sellerBranding.data?.logoRectUrl || sellerBranding.data?.logoUrl || null;
  const shopName = sellerBranding.data?.shopName ?? "Your shop";

  return (
    <header className="sticky top-0 z-40 shrink-0 border-b border-border bg-background/95 backdrop-blur">
      <div className="mx-auto flex h-16 w-full max-w-[100rem] items-center gap-token-3 px-token-4 sm:px-token-6">
        <button
          type="button"
          className="rounded-md p-token-2 text-foreground lg:hidden"
          aria-label={
            isExplore && onOpenFilters ? "Open menu and filters" : "Open menu"
          }
          onClick={() => {
            if (isExplore) setNavDrawerOpen(true);
            else setMobileOpen(true);
          }}
        >
          <Menu className="h-5 w-5" />
        </button>

        {isSellerDash ? (
          <Link
            href="/seller"
            className="flex min-w-0 shrink-0 items-center gap-2"
            aria-label={shopName}
          >
            {shopLogo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={shopLogo}
                alt={shopName}
                className="h-8 max-w-[10rem] object-contain object-left sm:h-9"
              />
            ) : (
              <span className="flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent text-white">
                  <Store className="h-4 w-4" aria-hidden />
                </span>
                <span className="hidden max-w-[10rem] truncate text-sm font-semibold text-foreground sm:inline">
                  {shopName}
                </span>
              </span>
            )}
          </Link>
        ) : (
          <BrandMark className="shrink-0" />
        )}
        {isAdmin && (
          <span className="hidden text-sm font-medium text-muted-foreground sm:inline">
            Admin
          </span>
        )}

        {!isAdmin && (
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
                className="h-10 rounded-r-none border-r-0 bg-shell-search pl-10"
                aria-label="Search products"
              />
            </div>
            <button
              type="submit"
              className="inline-flex h-10 shrink-0 items-center rounded-r-md bg-accent px-token-4 text-sm font-semibold text-white shadow-sm transition hover:bg-accent-deep"
            >
              Search
            </button>
          </form>
        )}

        <nav className="ml-auto flex items-center gap-token-1 sm:gap-token-2">
          {!isAdmin && (
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
                <div className="absolute right-0 z-50 mt-2 min-w-[11rem] rounded-xl border border-border bg-card py-1.5 shadow-md">
                  {companyLinks.map((l) => (
                    <Link
                      key={l.href}
                      href={l.href}
                      className="block px-3 py-2 text-sm transition hover:bg-muted"
                      onClick={() => setCompanyOpen(false)}
                    >
                      {l.label}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          )}

          <ThemeCycleToggle
            className={isAdmin ? "inline-flex" : "hidden lg:inline-flex"}
          />

          {!isAdmin && (
            <>
              <Link
                href={user ? "/buyer/favorites" : "/login?next=/buyer/favorites"}
                aria-label="Favorites"
                className="rounded-md p-token-2 text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                <Heart className="h-5 w-5" />
              </Link>
              <CartNav />
            </>
          )}

          {user ? (
            <UserAccountMenu />
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
                className="hidden rounded-md bg-accent px-token-4 py-token-2 text-sm font-medium text-white lg:inline"
              >
                Sign up
              </Link>
            </>
          )}
        </nav>
      </div>

      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          {/* Backdrop — page peeks on the right with blur */}
          <button
            type="button"
            className="absolute inset-0 bg-black/40 backdrop-blur-[4px]"
            aria-label="Close menu"
            onClick={() => setMobileOpen(false)}
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Navigation"
            className="absolute inset-y-0 left-0 flex h-[100dvh] w-[min(100%,20rem)] flex-col bg-card text-card-foreground shadow-2xl"
          >
            <div className="flex h-14 shrink-0 items-center justify-between gap-3 border-b border-border px-4">
              <BrandMark className="min-w-0 [&_img]:h-7" />
              <button
                type="button"
                onClick={() => setMobileOpen(false)}
                aria-label="Close"
                className="rounded-lg p-2 text-muted-foreground transition hover:bg-muted hover:text-foreground"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  setFilter("q", q.trim());
                  setMobileOpen(false);
                  if (pathname !== "/explore") router.push("/explore");
                }}
                className="border-b border-border px-4 py-3"
              >
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    placeholder="Search products…"
                    className="h-10 rounded-xl bg-muted pl-10"
                    aria-label="Search products"
                  />
                </div>
              </form>

              <nav className="space-y-5 p-4 pb-6 text-sm">
                <div>
                  <p className="mb-2 px-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                    Discover
                  </p>
                  <ul className="space-y-0.5">
                    <li>
                      <Link
                        href="/explore"
                        className="flex items-center gap-3 rounded-xl px-3 py-2.5 font-medium text-foreground transition hover:bg-muted"
                      >
                        <Store className="h-4 w-4 shrink-0 text-accent" />
                        Go to marketplace
                      </Link>
                    </li>
                    {user && (
                      <li>
                        <Link
                          href="/buyer/favorites"
                          className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-foreground transition hover:bg-muted"
                        >
                          <Heart className="h-4 w-4 shrink-0 text-muted-foreground" />
                          Favorites
                        </Link>
                      </li>
                    )}
                  </ul>
                </div>

                <div>
                  <p className="mb-2 px-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                    Company
                  </p>
                  <ul className="space-y-0.5">
                    {companyLinks.map((l) => (
                      <li key={l.href}>
                        <Link
                          href={l.href}
                          className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-foreground transition hover:bg-muted"
                        >
                          <l.icon className="h-4 w-4 shrink-0 text-muted-foreground" />
                          {l.label}
                        </Link>
                      </li>
                    ))}
                    <li>
                      <Link
                        href="/support"
                        className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-foreground transition hover:bg-muted"
                      >
                        <CircleHelp className="h-4 w-4 shrink-0 text-muted-foreground" />
                        Support
                      </Link>
                    </li>
                  </ul>
                </div>

                {(user?.role === "buyer" || !user) && (
                  <div>
                    <p className="mb-2 px-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                      Selling
                    </p>
                    <ul className="space-y-0.5">
                      <li>
                        <Link
                          href="/onboarding"
                          className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-foreground transition hover:bg-muted"
                        >
                          <Store className="h-4 w-4 shrink-0 text-muted-foreground" />
                          {user ? "Become a seller" : "Start selling"}
                        </Link>
                      </li>
                      {billingEnabled && (
                        <li>
                          <Link
                            href="/pricing"
                            className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-foreground transition hover:bg-muted"
                          >
                            <Tag className="h-4 w-4 shrink-0 text-muted-foreground" />
                            Seller pricing
                          </Link>
                        </li>
                      )}
                    </ul>
                  </div>
                )}

                {user && (
                  <div>
                    <p className="mb-2 px-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                      Account
                    </p>
                    <ul className="space-y-0.5">
                      <li>
                        <Link
                          href={
                            user.role === "super_admin"
                              ? "/admin"
                              : user.role === "seller" ||
                                  user.role === "tenant_admin"
                                ? "/seller"
                                : "/buyer"
                          }
                          className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-foreground transition hover:bg-muted"
                        >
                          <LayoutDashboard className="h-4 w-4 shrink-0 text-muted-foreground" />
                          Dashboard
                        </Link>
                      </li>
                    </ul>
                  </div>
                )}

                <div>
                  <p className="mb-2 px-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                    Appearance
                  </p>
                  <MobileThemeRow />
                </div>
              </nav>
            </div>

            <div className="shrink-0 space-y-2 border-t border-border bg-card p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
              {!user ? (
                <>
                  <Link
                    href="/login"
                    className="flex h-11 items-center justify-center rounded-xl border border-border bg-background text-sm font-semibold transition hover:bg-muted"
                  >
                    Sign in
                  </Link>
                  <Link
                    href="/signup"
                    className="flex h-11 items-center justify-center rounded-xl bg-accent text-sm font-semibold text-white transition hover:bg-accent-deep"
                  >
                    Sign up
                  </Link>
                </>
              ) : (
                <Link
                  href="/explore"
                  className="flex h-11 items-center justify-center gap-2 rounded-xl bg-accent text-sm font-semibold text-white transition hover:bg-accent-deep"
                >
                  <Store className="h-4 w-4" aria-hidden />
                  Go to marketplace
                </Link>
              )}
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
        if (pathname !== "/explore") router.push("/explore");
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

function MobileThemeRow() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (!mounted) {
    return (
      <div className="h-11 animate-pulse rounded-xl bg-muted px-3" aria-hidden />
    );
  }

  const isDark = resolvedTheme === "dark";

  return (
    <div className="grid grid-cols-2 gap-2 px-1">
      <button
        type="button"
        onClick={() => setTheme("light")}
        className={cn(
          "inline-flex h-11 items-center justify-center gap-2 rounded-xl border text-sm font-medium transition",
          !isDark
            ? "border-accent bg-accent/10 text-foreground"
            : "border-border text-muted-foreground hover:bg-muted"
        )}
      >
        <Sun className="h-4 w-4" aria-hidden />
        Light
      </button>
      <button
        type="button"
        onClick={() => setTheme("dark")}
        className={cn(
          "inline-flex h-11 items-center justify-center gap-2 rounded-xl border text-sm font-medium transition",
          isDark
            ? "border-accent bg-accent/10 text-foreground"
            : "border-border text-muted-foreground hover:bg-muted"
        )}
      >
        <Moon className="h-4 w-4" aria-hidden />
        Dark
      </button>
    </div>
  );
}
