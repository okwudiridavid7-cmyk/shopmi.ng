"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronDown, Heart, Menu, Search, User, X } from "lucide-react";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import type {
  ShopCategoryPublic,
  StoreThemeId,
  TenantPublic,
} from "@vendors/shared-types";
import { VerifiedBadge } from "./trust-badge";
import { CartNav } from "./cart-nav";
import { ShopLogoFallback } from "@/components/shop-logo-fallback";
import { ThemeCycleToggle } from "@/components/theme-cycle-toggle";
import { useAuth } from "@/hooks/use-auth";
import { Input } from "@/components/ui/input";
import { apiFetch } from "@/lib/api";
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

const PRIMARY_LINKS = SHOP_LINKS.slice(0, 3);

type NavProps = {
  tenant: TenantPublic | null;
  slug: string;
  onOpenFilters?: () => void;
  themeId?: StoreThemeId;
  container?: string;
};

function useShopSearch(slug: string) {
  const router = useRouter();
  const [q, setQ] = useState("");
  function submit(e: React.FormEvent) {
    e.preventDefault();
    const params = q.trim() ? `?q=${encodeURIComponent(q.trim())}` : "";
    router.push(`/shops/${slug}${params}`);
  }
  return { q, setQ, submit };
}

function ShopMark({
  tenant,
  slug,
  nameClass,
  logoClass = "h-8",
}: {
  tenant: TenantPublic | null;
  slug: string;
  nameClass: string;
  logoClass?: string;
}) {
  const theme = parseThemeSettings(tenant?.themeSettings ?? null);
  const name = tenant?.name ?? slug;
  return (
    <Link href={`/shops/${slug}`} className="flex min-w-0 items-center gap-token-2">
      {theme.logoRectUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={theme.logoRectUrl} alt={name} className={`${logoClass} max-w-[10rem] object-contain`} />
      ) : (
        <>
          {theme.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={theme.logoUrl} alt="" className={`${logoClass} aspect-square rounded-md object-cover`} />
          ) : null}
          <span className={`min-w-0 truncate ${nameClass}`}>{name}</span>
        </>
      )}
      {tenant?.verifiedBadge && <VerifiedBadge size="sm" />}
    </Link>
  );
}

function AccountLink({ slug, className }: { slug: string; className: string }) {
  const { user, initials } = useAuth();
  return user ? (
    <Link href="/buyer" aria-label="Your account" className={className}>
      <span className="text-xs font-semibold">{initials ?? "U"}</span>
    </Link>
  ) : (
    <Link href={`/login?next=/shops/${slug}`} aria-label="Sign in" className={className}>
      <User className="h-5 w-5" />
    </Link>
  );
}

function MobileDrawer({
  open,
  onClose,
  slug,
  name,
  onOpenFilters,
}: {
  open: boolean;
  onClose: () => void;
  slug: string;
  name: string;
  onOpenFilters?: () => void;
}) {
  const { user } = useAuth();
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 lg:hidden">
      <button
        type="button"
        className="absolute inset-0 bg-black/40"
        aria-label="Close menu"
        onClick={onClose}
      />
      <div className="absolute inset-y-0 left-0 flex w-[min(100%,20rem)] flex-col bg-card text-foreground shadow-lg">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <p className="text-sm font-medium">{name}</p>
          <button type="button" onClick={onClose} aria-label="Close">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="space-y-1 p-4 text-sm">
          {SHOP_LINKS.map((l) => (
            <Link
              key={l.suffix || "home"}
              href={`/shops/${slug}${l.suffix}`}
              className="block rounded-md px-3 py-2 hover:bg-muted"
              onClick={onClose}
            >
              {l.label}
            </Link>
          ))}
          {onOpenFilters && (
            <button
              type="button"
              className="block w-full rounded-md px-3 py-2 text-left hover:bg-muted"
              onClick={() => {
                onClose();
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
              onClick={onClose}
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
  );
}

export function ShopNav(props: NavProps) {
  const id = props.themeId ?? "classic";
  if (id === "mono") return <MonoNav {...props} />;
  if (id === "runway") return <RunwayNav {...props} />;
  if (id === "atelier") return <AtelierNav {...props} />;
  if (id === "bazaar") return <BazaarNav {...props} />;
  if (id === "pop") return <PopNav {...props} />;
  return <ClassicNav {...props} />;
}

/* Classic: brand-filled bar (original Shopmi.ng header). */
function ClassicNav({ tenant, slug, onOpenFilters }: NavProps) {
  const theme = parseThemeSettings(tenant?.themeSettings ?? null);
  const primary =
    parseHexColor(theme.primaryColor) ?? parseHexColor(theme.accentColor);
  const textColor = brandButtonTextColor(primary);
  const name = tenant?.name ?? slug;
  const { q, setQ, submit } = useShopSearch(slug);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);

  const barStyle = primary
    ? { backgroundColor: primary, color: textColor, borderColor: primary }
    : { backgroundColor: "var(--color-card)", color: "var(--color-foreground)" };

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
            <img src={theme.logoUrl} alt="" className="h-8 w-8 rounded-md object-cover" />
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

        <form onSubmit={submit} className="relative mx-auto hidden min-w-0 max-w-md flex-1 lg:block">
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
          <FavoritesLink slug={slug} className="rounded-md p-2 opacity-90 hover:opacity-100" />
          <div className={primary ? "[&_button]:text-inherit" : ""}>
            <CartNav />
          </div>
          <AccountLink
            slug={slug}
            className="flex h-8 w-8 items-center justify-center rounded-md bg-black/20"
          />
        </nav>
      </div>

      <form onSubmit={submit} className="px-token-4 pb-token-3 lg:hidden">
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

      <MobileDrawer
        open={mobileOpen}
        onClose={() => setMobileOpen(false)}
        slug={slug}
        name={name}
        onOpenFilters={onOpenFilters}
      />
    </header>
  );
}

function FavoritesLink({ slug, className }: { slug: string; className: string }) {
  const { user } = useAuth();
  return (
    <Link
      href={user ? "/buyer/favorites" : `/login?next=/shops/${slug}`}
      aria-label="Favorites"
      className={className}
    >
      <Heart className="h-5 w-5" />
    </Link>
  );
}

function MenuButton({ onClick, className = "" }: { onClick: () => void; className?: string }) {
  return (
    <button
      type="button"
      className={`rounded-md p-2 lg:hidden ${className}`}
      aria-label="Open menu"
      onClick={onClick}
    >
      <Menu className="h-5 w-5" />
    </button>
  );
}

/* Mono: logo + links left, centred search, bordered icon buttons (Next.js Commerce). */
function MonoNav({ tenant, slug, onOpenFilters, container = "max-w-7xl" }: NavProps) {
  const name = tenant?.name ?? slug;
  const { q, setQ, submit } = useShopSearch(slug);
  const [mobileOpen, setMobileOpen] = useState(false);
  const box =
    "flex h-10 w-10 items-center justify-center rounded-md border border-border text-foreground transition hover:bg-muted";

  const search = (
    <form onSubmit={submit} className="relative w-full">
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search for products..."
        aria-label="Search this shop"
        className="h-10 w-full rounded-lg border border-border bg-card px-4 pr-10 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:border-[color-mix(in_srgb,var(--color-foreground)_40%,transparent)]"
      />
      <Search className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
    </form>
  );

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-[color-mix(in_srgb,var(--color-background)_90%,transparent)] backdrop-blur">
      <div className={`mx-auto flex h-16 w-full ${container} items-center gap-token-4 px-token-4 lg:px-token-6`}>
        <MenuButton onClick={() => setMobileOpen(true)} />
        <div className="flex min-w-0 items-center gap-token-6 md:w-1/3">
          <ShopMark
            tenant={tenant}
            slug={slug}
            nameClass="text-sm font-semibold uppercase tracking-wide text-foreground"
          />
          <ul className="hidden items-center gap-token-5 text-sm lg:flex">
            {PRIMARY_LINKS.map((l) => (
              <li key={l.label}>
                <Link
                  href={`/shops/${slug}${l.suffix}`}
                  className="text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
                >
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
        <div className="hidden justify-center md:flex md:w-1/3">{search}</div>
        <div className="ml-auto flex items-center justify-end gap-token-2 md:w-1/3">
          <ThemeCycleToggle />
          <FavoritesLink slug={slug} className={`${box} hidden sm:flex`} />
          <div className={`${box} [&_button]:p-0 [&_button:hover]:bg-transparent`}>
            <CartNav />
          </div>
          <AccountLink slug={slug} className={box} />
        </div>
      </div>
      <div className="px-token-4 pb-token-3 md:hidden">{search}</div>
      <MobileDrawer open={mobileOpen} onClose={() => setMobileOpen(false)} slug={slug} name={name} onOpenFilters={onOpenFilters} />
    </header>
  );
}

/* Runway: scrolling announcement + wide uppercase nav (Pilot). */
function RunwayNav({ tenant, slug, onOpenFilters, container = "max-w-7xl" }: NavProps) {
  const name = tenant?.name ?? slug;
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const { q, setQ, submit } = useShopSearch(slug);
  const notes = [
    "Secure checkout with Paystack",
    tenant?.location ? `Ships from ${tenant.location}` : null,
    "Track every order from your account",
    `New in at ${name}`,
  ].filter(Boolean) as string[];
  const icon = "rounded-md p-2 text-foreground transition hover:opacity-70";

  return (
    <header className="sticky top-0 z-40 bg-background">
      <div className="overflow-hidden border-b border-transparent bg-[#1e1c1a] py-2 text-[11px] uppercase tracking-[0.18em] text-white dark:border-border dark:bg-[#151412]">
        <div className="flex w-max animate-marquee gap-12 [--duration:40s] [--gap:3rem]">
          {[...notes, ...notes, ...notes].map((n, i) => (
            <span key={i} className="whitespace-nowrap">
              {n}
            </span>
          ))}
        </div>
      </div>
      <div className="border-b border-border">
        <div className={`mx-auto grid h-16 w-full ${container} grid-cols-[auto_1fr_auto] items-center gap-token-4 px-token-4 lg:grid-cols-3 lg:px-token-6`}>
          <div className="flex items-center gap-token-2">
            <MenuButton onClick={() => setMobileOpen(true)} />
            <ShopMark
              tenant={tenant}
              slug={slug}
              nameClass="font-display text-2xl uppercase tracking-wide text-foreground"
            />
          </div>
          <nav className="hidden justify-center gap-token-6 lg:flex">
            {PRIMARY_LINKS.map((l) => (
              <Link
                key={l.label}
                href={`/shops/${slug}${l.suffix}`}
                className="text-[13px] font-medium uppercase tracking-[0.14em] text-foreground underline-offset-8 hover:underline"
              >
                {l.label}
              </Link>
            ))}
          </nav>
          <div className="flex items-center justify-end gap-1">
            <button type="button" aria-label="Search" className={icon} onClick={() => setSearchOpen((v) => !v)}>
              <Search className="h-5 w-5" />
            </button>
            <ThemeCycleToggle />
            <AccountLink slug={slug} className={icon} />
            <CartNav />
          </div>
        </div>
        {searchOpen && (
          <form onSubmit={submit} className={`mx-auto w-full ${container} px-token-4 pb-token-4 lg:px-token-6`}>
            <input
              autoFocus
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={`Search ${name}`}
              aria-label="Search this shop"
              className="h-12 w-full border-b-2 border-foreground bg-transparent text-lg uppercase tracking-wide text-foreground outline-none placeholder:text-muted-foreground"
            />
          </form>
        )}
      </div>
      <MobileDrawer open={mobileOpen} onClose={() => setMobileOpen(false)} slug={slug} name={name} onOpenFilters={onOpenFilters} />
    </header>
  );
}

/* Atelier: links left, centred serif mark, quiet icons right (Sofa Society). */
function AtelierNav({ tenant, slug, onOpenFilters, container = "max-w-6xl" }: NavProps) {
  const name = tenant?.name ?? slug;
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const { q, setQ, submit } = useShopSearch(slug);
  const icon = "rounded-full p-2 text-foreground transition hover:bg-muted";
  const links = [
    { href: `/shops/${slug}#products`, label: "Shop" },
    { href: `/shops/${slug}/contact`, label: "About" },
    { href: `/shops/${slug}/faq`, label: "FAQs" },
  ];

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-[color-mix(in_srgb,var(--color-background)_95%,transparent)] backdrop-blur">
      <div className={`mx-auto grid h-20 w-full ${container} grid-cols-[1fr_auto_1fr] items-center gap-token-4 px-token-4 lg:px-token-6`}>
        <div className="flex items-center gap-token-5">
          <MenuButton onClick={() => setMobileOpen(true)} />
          {links.map((l) => (
            <Link key={l.label} href={l.href} className="hidden text-sm text-muted-foreground transition hover:text-foreground lg:inline">
              {l.label}
            </Link>
          ))}
        </div>
        <ShopMark
          tenant={tenant}
          slug={slug}
          nameClass="font-display text-2xl text-foreground sm:text-[1.7rem]"
          logoClass="h-9"
        />
        <div className="flex items-center justify-end gap-1">
          <button type="button" aria-label="Search" className={icon} onClick={() => setSearchOpen((v) => !v)}>
            <Search className="h-[18px] w-[18px]" />
          </button>
          <ThemeCycleToggle />
          <FavoritesLink slug={slug} className={`${icon} hidden sm:inline-flex`} />
          <AccountLink slug={slug} className={`${icon} hidden sm:inline-flex`} />
          <CartNav />
        </div>
      </div>
      {searchOpen && (
        <form onSubmit={submit} className={`mx-auto w-full ${container} px-token-4 pb-token-5 lg:px-token-6`}>
          <input
            autoFocus
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={`Search ${name}`}
            aria-label="Search this shop"
            className="h-12 w-full rounded-full border border-border bg-card px-5 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:border-[color-mix(in_srgb,var(--color-foreground)_40%,transparent)]"
          />
        </form>
      )}
      <MobileDrawer open={mobileOpen} onClose={() => setMobileOpen(false)} slug={slug} name={name} onOpenFilters={onOpenFilters} />
    </header>
  );
}

function useNavShopCategories(slug: string) {
  return useQuery({
    queryKey: ["shops", slug, "shop-categories"] as const,
    queryFn: async () => {
      const res = await apiFetch<{ categories: ShopCategoryPublic[] }>(
        `/api/shops/${slug}/shop-categories`
      );
      return res.categories;
    },
    enabled: !!slug,
  });
}

/* Bazaar: utility strip, big attached search, category row (Flowbite free blocks). */
function BazaarNav({ tenant, slug, onOpenFilters, container = "max-w-7xl" }: NavProps) {
  const name = tenant?.name ?? slug;
  const [mobileOpen, setMobileOpen] = useState(false);
  const { q, setQ, submit } = useShopSearch(slug);
  const cats = useNavShopCategories(slug).data ?? [];
  const labeled =
    "flex flex-col items-center gap-0.5 rounded-md px-2 py-1 text-[11px] font-medium text-muted-foreground transition hover:bg-muted hover:text-foreground";

  return (
    <header className="sticky top-0 z-40 bg-card shadow-sm">
      <div className="hidden border-b border-transparent bg-gray-900 text-xs text-gray-100 sm:block dark:border-border dark:bg-[#0d0d0f]">
        <div className={`mx-auto flex h-9 w-full ${container} items-center justify-between px-token-4 lg:px-token-6`}>
          <p className="truncate opacity-90">
            Sold by {name}
            {tenant?.location ? ` · ${tenant.location}` : ""} · Secure Paystack checkout
          </p>
          <nav className="flex items-center gap-token-4 opacity-90">
            <Link href={`/shops/${slug}/faq`} className="hover:underline">Help</Link>
            <Link href={`/shops/${slug}/contact`} className="hover:underline">Contact</Link>
            <Link href="/buyer/orders" className="hover:underline">Track orders</Link>
          </nav>
        </div>
      </div>
      <div className={`mx-auto flex h-16 w-full ${container} items-center gap-token-4 px-token-4 lg:px-token-6`}>
        <MenuButton onClick={() => setMobileOpen(true)} />
        <ShopMark tenant={tenant} slug={slug} nameClass="text-lg font-bold text-foreground" />
        <form onSubmit={submit} className="mx-auto hidden h-11 max-w-2xl flex-1 overflow-hidden rounded-lg border-2 border-[var(--shop-brand)] md:flex">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={`Search products, brands and categories`}
            aria-label="Search this shop"
            className="min-w-0 flex-1 bg-card px-4 text-sm text-foreground outline-none placeholder:text-muted-foreground"
          />
          <button
            type="submit"
            className="flex items-center gap-2 bg-[var(--shop-brand)] px-5 text-sm font-semibold text-[color:var(--shop-brand-fg)]"
          >
            <Search className="h-4 w-4" />
            Search
          </button>
        </form>
        <div className="ml-auto flex items-center gap-1 md:ml-0">
          <ThemeCycleToggle />
          <AccountLink slug={slug} className={labeled} />
          <FavoritesLink slug={slug} className={`${labeled} hidden sm:flex`} />
          <CartNav />
        </div>
      </div>
      <form onSubmit={submit} className="flex gap-2 px-token-4 pb-token-3 md:hidden">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search products"
          className="h-10 min-w-0 flex-1 rounded-lg border-2 border-[var(--shop-brand)] bg-card px-3 text-sm outline-none"
        />
      </form>
      {cats.length > 0 && (
        <div className="border-t border-border">
          <nav className={`mx-auto flex w-full ${container} gap-1 overflow-x-auto px-token-4 py-1.5 text-sm lg:px-token-6`}>
            <Link href={`/shops/${slug}#products`} className="shrink-0 rounded-md px-3 py-1.5 font-semibold text-foreground hover:bg-muted">
              All products
            </Link>
            {cats.map((c) => (
              <Link
                key={c.id}
                href={`/shops/${slug}?cat=${encodeURIComponent(c.slug)}#products`}
                className="shrink-0 rounded-md px-3 py-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                {c.name}
              </Link>
            ))}
          </nav>
        </div>
      )}
      <MobileDrawer open={mobileOpen} onClose={() => setMobileOpen(false)} slug={slug} name={name} onOpenFilters={onOpenFilters} />
    </header>
  );
}

/* Pop: thick rule, boxed logo, pill search, hard-shadow buttons (neobrutalism). */
function PopNav({ tenant, slug, onOpenFilters, container = "max-w-6xl" }: NavProps) {
  const name = tenant?.name ?? slug;
  const [mobileOpen, setMobileOpen] = useState(false);
  const { q, setQ, submit } = useShopSearch(slug);
  const box =
    "flex h-10 w-10 items-center justify-center rounded-md border-2 border-foreground bg-card text-foreground shadow-[var(--pop-shadow-sm)] transition hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none";

  const search = (
    <form onSubmit={submit} className="relative w-full">
      <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-foreground" />
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder={`Search ${name}`}
        aria-label="Search this shop"
        className="h-11 w-full rounded-full border-2 border-foreground bg-card pl-10 pr-4 text-sm font-medium text-foreground outline-none placeholder:text-muted-foreground"
      />
    </form>
  );

  return (
    <header className="sticky top-0 z-40 border-b-[3px] border-foreground bg-background">
      <div className={`mx-auto flex h-[4.5rem] w-full ${container} items-center gap-token-4 px-token-4 lg:px-token-6`}>
        <MenuButton onClick={() => setMobileOpen(true)} className="border-2 border-foreground" />
        <ShopMark tenant={tenant} slug={slug} nameClass="text-xl font-extrabold tracking-tight text-foreground" />
        <nav className="hidden items-center gap-token-5 text-sm font-bold lg:flex">
          {PRIMARY_LINKS.map((l) => (
            <Link key={l.label} href={`/shops/${slug}${l.suffix}`} className="text-foreground underline-offset-4 hover:underline">
              {l.label}
            </Link>
          ))}
        </nav>
        <div className="mx-auto hidden max-w-sm flex-1 md:block">{search}</div>
        <div className="ml-auto flex items-center gap-token-2 md:ml-0">
          <div className={`${box} [&_button]:p-0 [&_button:hover]:bg-transparent`}>
            <ThemeCycleToggle />
          </div>
          <FavoritesLink slug={slug} className={`${box} hidden sm:flex`} />
          <div className={`${box} [&_button]:p-0 [&_button:hover]:bg-transparent`}>
            <CartNav />
          </div>
          <AccountLink slug={slug} className={box} />
        </div>
      </div>
      <div className="px-token-4 pb-token-3 md:hidden">{search}</div>
      <MobileDrawer open={mobileOpen} onClose={() => setMobileOpen(false)} slug={slug} name={name} onOpenFilters={onOpenFilters} />
    </header>
  );
}