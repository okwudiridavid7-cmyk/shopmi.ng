"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronDown, Heart, Menu, Search, User, X } from "lucide-react";
import { useEffect, useState } from "react";
import type { TenantPublic } from "@vendors/shared-types";
import { VerifiedBadge } from "./trust-badge";
import { CartNav } from "./cart-nav";
import { ShopLogoFallback } from "@/components/shop-logo-fallback";
import { ThemeCycleToggle } from "@/components/theme-cycle-toggle";
import { useAuth } from "@/hooks/use-auth";
import { Input } from "@/components/ui/input";
import {
  brandButtonTextColor,
  parseHexColor,
  parseThemeSettings,
} from "@/lib/theme";

const SHOP_LINKS = [
  { suffix: "", label: "Shop" },
  { suffix: "/faq", label: "FAQs" },
  { suffix: "/contact", label: "Contact" },
  { suffix: "/terms", label: "Terms" },
  { suffix: "/privacy", label: "Privacy" },
] as const;

export function ShopNav({
  tenant,
  slug,
  onOpenFilters,
}: {
  tenant: TenantPublic | null;
  slug: string;
  onOpenFilters?: () => void;
}) {
  const theme = parseThemeSettings(tenant?.themeSettings ?? null);
  const primary =
    parseHexColor(theme.primaryColor) ?? parseHexColor(theme.accentColor);
  const textColor = brandButtonTextColor(primary);
  const name = tenant?.name ?? slug;
  const { user } = useAuth();
  const router = useRouter();
  const [q, setQ] = useState("");
  const [mobileOpen, setMobileOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);

  const barStyle = primary
    ? { backgroundColor: primary, color: textColor, borderColor: primary }
    : { backgroundColor: "var(--color-card)", color: "var(--color-foreground)" };

  function searchShop(e: React.FormEvent) {
    e.preventDefault();
    const params = q.trim() ? `?q=${encodeURIComponent(q.trim())}` : "";
    router.push(`/shops/${slug}${params}`);
  }

  return (
    <header className="sticky top-0 z-40 border-b" style={barStyle}>
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center gap-token-3 px-token-4 sm:px-token-6">
        <button
          type="button"
          className="rounded-md p-2 lg:hidden"
          style={{ color: textColor }}
          aria-label="Open menu"
          onClick={() => setMobileOpen(true)}
        >
          <Menu className="h-5 w-5" />
        </button>

        <Link href={`/shops/${slug}`} className="flex min-w-0 items-center gap-token-2">
          {theme.logoRectUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={theme.logoRectUrl} alt="" className="h-8 max-w-[9rem] object-contain" />
          ) : theme.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={theme.logoUrl}
              alt=""
              className="h-8 w-8 rounded-md object-cover"
            />
          ) : (
            <ShopLogoFallback size="sm" className="border-0" />
          )}
          {!theme.logoRectUrl && (
            <span className="hidden min-w-0 items-center gap-1 truncate font-display text-lg sm:inline-flex">
              <span className="truncate">{name}</span>
              {tenant?.verifiedBadge && <VerifiedBadge size="sm" />}
            </span>
          )}
          {theme.logoRectUrl && tenant?.verifiedBadge && <VerifiedBadge size="sm" />}
        </Link>

        <form onSubmit={searchShop} className="relative mx-auto hidden min-w-0 max-w-md flex-1 lg:block">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 opacity-70" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={`Search ${name}…`}
            className="h-10 border-white/20 bg-white/15 pl-10 text-inherit placeholder:text-current/60"
            aria-label="Search this shop"
          />
        </form>

        <nav className="ml-auto flex items-center gap-1">
          <div className="relative hidden lg:block">
            <button
              type="button"
              className="inline-flex items-center gap-1 rounded-md px-3 py-2 text-sm opacity-90 hover:opacity-100"
              onClick={() => setMoreOpen((v) => !v)}
            >
              Pages <ChevronDown className="h-3.5 w-3.5" />
            </button>
            {moreOpen && (
              <div className="absolute right-0 z-50 mt-2 min-w-[11rem] rounded-md border border-border bg-card py-1 text-foreground shadow-md">
                {SHOP_LINKS.map((l) => (
                  <Link
                    key={l.suffix || "home"}
                    href={`/shops/${slug}${l.suffix}`}
                    className="block px-3 py-2 text-sm hover:bg-muted"
                    onClick={() => setMoreOpen(false)}
                  >
                    {l.label}
                  </Link>
                ))}
              </div>
            )}
          </div>
          <ThemeCycleToggle onBrand={!!primary} />
          <Link
            href={user ? "/buyer/favorites" : `/login?next=/shops/${slug}`}
            aria-label="Favorites"
            className="rounded-md p-2 opacity-90 hover:opacity-100"
          >
            <Heart className="h-5 w-5" />
          </Link>
          <div className={primary ? "[&_button]:text-inherit" : ""}>
            <CartNav />
          </div>
          {user ? (
            <Link
              href="/buyer"
              className="flex h-8 w-8 items-center justify-center rounded-md bg-black/20 text-xs font-semibold"
            >
              {user.email.slice(0, 1).toUpperCase()}
            </Link>
          ) : (
            <Link href={`/login?next=/shops/${slug}`} aria-label="Sign in" className="p-2">
              <User className="h-5 w-5" />
            </Link>
          )}
        </nav>
      </div>

      <form
        onSubmit={searchShop}
        className="px-token-4 pb-token-3 lg:hidden"
      >
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 opacity-70" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={`Search ${name}…`}
            className="h-10 border-white/20 bg-white/15 pl-10 text-inherit placeholder:text-current/60"
          />
        </div>
      </form>

      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-foreground/40"
            aria-label="Close menu"
            onClick={() => setMobileOpen(false)}
          />
          <div className="absolute inset-y-0 left-0 flex w-[min(100%,20rem)] flex-col bg-card text-foreground shadow-lg">
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <p className="text-sm font-medium">{name}</p>
              <button type="button" onClick={() => setMobileOpen(false)} aria-label="Close">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-1 p-4 text-sm">
              {SHOP_LINKS.map((l) => (
                <Link
                  key={l.suffix || "home"}
                  href={`/shops/${slug}${l.suffix}`}
                  className="block rounded-md px-3 py-2 hover:bg-muted"
                  onClick={() => setMobileOpen(false)}
                >
                  {l.label}
                </Link>
              ))}
              {onOpenFilters && (
                <button
                  type="button"
                  className="block w-full rounded-md px-3 py-2 text-left hover:bg-muted"
                  onClick={() => {
                    setMobileOpen(false);
                    onOpenFilters();
                  }}
                >
                  Filters
                </button>
              )}
              {user?.role === "buyer" && (
                <Link
                  href="/onboarding"
                  className="block rounded-md px-3 py-2 hover:bg-muted"
                  onClick={() => setMobileOpen(false)}
                >
                  Become a seller
                </Link>
              )}
              <div className="pt-4">
                <ThemeCycleToggle />
              </div>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
