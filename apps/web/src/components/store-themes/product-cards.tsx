"use client";

import Link from "next/link";
import { Eye, Heart, Plus, ShieldCheck, ShoppingCart, Star, Truck } from "lucide-react";
import type { StoreThemeId } from "@vendors/shared-types";
import { formatMoney } from "@/lib/api";

export type ThemedCardProps = {
  variant: Exclude<StoreThemeId, "classic">;
  href: string;
  imageUrl?: string | null;
  secondImageUrl?: string | null;
  title: string;
  price: number;
  compareAtPrice?: number | null;
  currency?: string;
  shopName?: string | null;
  reviewCount?: number;
  avgRating?: number | null;
  stockQty?: number | null;
  isNew?: boolean;
  favorited?: boolean;
  onFavoriteToggle?: () => void;
  favoriteBusy?: boolean;
  onAddToCart?: () => void;
  addToCartBusy?: boolean;
  className?: string;
};

function pctOff(price: number, compare?: number | null): number {
  if (compare == null || compare <= price || price <= 0) return 0;
  return Math.round(((compare - price) / compare) * 100);
}

function stop(fn?: () => void) {
  return (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    fn?.();
  };
}

function Img({ src, alt, className }: { src?: string | null; alt: string; className: string }) {
  if (!src) {
    return (
      <div className="flex h-full w-full items-center justify-center text-sm text-muted-foreground">
        No image
      </div>
    );
  }
  // eslint-disable-next-line @next/next/no-img-element
  return <img decoding="async" src={src} alt={alt} loading="lazy" className={className} />;
}

function FavButton({
  favorited,
  busy,
  onToggle,
  className,
}: {
  favorited?: boolean;
  busy?: boolean;
  onToggle?: () => void;
  className: string;
}) {
  if (!onToggle) return null;
  return (
    <button
      type="button"
      disabled={busy}
      onClick={stop(onToggle)}
      aria-label={favorited ? "Remove from favorites" : "Add to favorites"}
      aria-pressed={!!favorited}
      className={`transition disabled:opacity-50 ${className}`}
    >
      <Heart className={`h-4 w-4 ${favorited ? "fill-danger text-danger" : ""}`} aria-hidden />
    </button>
  );
}

function Stars({ rating }: { rating: number }) {
  return (
    <span className="flex items-center gap-0.5" aria-hidden>
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          className={`h-3.5 w-3.5 ${
            i < Math.round(rating) ? "fill-amber-400 text-amber-400" : "text-muted-foreground opacity-40"
          }`}
        />
      ))}
    </span>
  );
}

export function ThemedProductCard(props: ThemedCardProps) {
  switch (props.variant) {
    case "mono":
      return <MonoCard {...props} />;
    case "runway":
      return <RunwayCard {...props} />;
    case "atelier":
      return <AtelierCard {...props} />;
    case "bazaar":
      return <BazaarCard {...props} />;
    case "pop":
      return <PopCard {...props} />;
  }
}

/* Mono - tile with frosted title/price label (Next.js Commerce GridTileImage + Label). */
function MonoCard(p: ThemedCardProps) {
  const off = pctOff(p.price, p.compareAtPrice);
  return (
    <article className={`group relative ${p.className ?? ""}`}>
      <Link
        href={p.href}
        className="relative block aspect-square overflow-hidden rounded-lg border border-border bg-card transition hover:border-[var(--shop-brand)]"
      >
        <Img
          src={p.imageUrl}
          alt={p.title}
          className="h-full w-full object-cover transition duration-300 ease-in-out group-hover:scale-105"
        />
        {off > 0 && (
          <span className="absolute left-3 top-3 rounded-full bg-foreground px-2 py-0.5 text-[11px] font-semibold text-background">
            −{off}%
          </span>
        )}
        <div className="absolute bottom-0 left-0 flex w-full px-3 pb-3">
          <div className="flex max-w-full flex-wrap items-center gap-y-1 rounded-2xl border border-border bg-white/70 p-1 text-xs font-semibold text-black backdrop-blur-md sm:flex-nowrap sm:rounded-full dark:bg-black/70 dark:text-white">
            <h3 className="line-clamp-1 basis-full px-2 pt-1 leading-tight tracking-tight sm:mr-3 sm:basis-auto sm:grow sm:pr-0 sm:pt-0 sm:leading-none">
              {p.title}
            </h3>
            <span className="flex-none rounded-full bg-[var(--shop-brand)] p-2 text-[color:var(--shop-brand-fg)]">
              {formatMoney(p.price, p.currency)}
            </span>
          </div>
        </div>
      </Link>
      <div className="absolute right-3 top-3 flex flex-col gap-2">
        <FavButton
          favorited={p.favorited}
          busy={p.favoriteBusy}
          onToggle={p.onFavoriteToggle}
          className="rounded-full border border-border bg-white/80 p-2 text-black backdrop-blur hover:bg-white dark:bg-black/70 dark:text-white"
        />
        {p.onAddToCart && (
          <button
            type="button"
            disabled={p.addToCartBusy}
            onClick={stop(p.onAddToCart)}
            aria-label="Add to cart"
            className="rounded-full border border-border bg-white/80 p-2 text-black opacity-100 backdrop-blur transition hover:bg-white disabled:opacity-50 sm:opacity-0 sm:group-hover:opacity-100 dark:bg-black/70 dark:text-white"
          >
            <Plus className="h-4 w-4" aria-hidden />
          </button>
        )}
      </div>
    </article>
  );
}

/* Runway - tall image with hover photo swap, vendor line, quick add bar (Pilot ProductCard). */
function RunwayCard(p: ThemedCardProps) {
  const off = pctOff(p.price, p.compareAtPrice);
  const vendor = p.shopName?.split(" · ")[0];
  return (
    <article className={`group relative ${p.className ?? ""}`}>
      <Link href={p.href} className="relative block aspect-[3/4] overflow-hidden bg-muted">
        <Img
          src={p.imageUrl}
          alt={p.title}
          className={`absolute inset-0 h-full w-full object-cover transition duration-500 ${
            p.secondImageUrl ? "group-hover:opacity-0" : "group-hover:scale-[1.03]"
          }`}
        />
        {p.secondImageUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img decoding="async"
            src={p.secondImageUrl}
            alt=""
            loading="lazy"
            className="absolute inset-0 h-full w-full object-cover opacity-0 transition duration-500 group-hover:opacity-100"
          />
        )}
        {off > 0 ? (
          <span className="absolute right-3 top-3 bg-[#c2410c] px-2 py-1 text-[11px] font-semibold uppercase tracking-wider text-white">
            −{off}% off
          </span>
        ) : p.isNew ? (
          <span className="absolute right-3 top-3 bg-background px-2 py-1 text-[11px] font-semibold uppercase tracking-wider text-foreground">
            New
          </span>
        ) : null}
        {p.onAddToCart && (
          <button
            type="button"
            disabled={p.addToCartBusy}
            onClick={stop(p.onAddToCart)}
            className="absolute inset-x-3 bottom-3 bg-[color-mix(in_srgb,var(--color-background)_95%,transparent)] py-3 text-center text-xs font-semibold uppercase tracking-[0.2em] text-foreground opacity-100 transition duration-300 hover:bg-foreground hover:text-background disabled:opacity-50 sm:translate-y-2 sm:opacity-0 sm:group-hover:translate-y-0 sm:group-hover:opacity-100"
          >
            Quick add
          </button>
        )}
      </Link>
      <FavButton
        favorited={p.favorited}
        busy={p.favoriteBusy}
        onToggle={p.onFavoriteToggle}
        className="absolute left-3 top-3 bg-[color-mix(in_srgb,var(--color-background)_90%,transparent)] p-2 text-foreground hover:bg-background"
      />
      <div className="space-y-1 pt-3">
        {vendor && (
          <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">{vendor}</p>
        )}
        {(p.reviewCount ?? 0) > 0 && p.avgRating != null && (
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Stars rating={p.avgRating} />
            {p.avgRating.toFixed(1)} ({p.reviewCount})
          </p>
        )}
        <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between sm:gap-3">
          <Link href={p.href} className="line-clamp-2 text-sm font-medium text-foreground hover:underline">
            {p.title}
          </Link>
          <p className="shrink-0 text-sm text-foreground sm:text-right">
            {formatMoney(p.price, p.currency)}
            {off > 0 && (
              <span className="ml-1.5 text-muted-foreground line-through">
                {formatMoney(p.compareAtPrice!, p.currency)}
              </span>
            )}
          </p>
        </div>
      </div>
    </article>
  );
}

/* Atelier - soft portrait image, centred serif title, quiet add-to-bag link. */
function AtelierCard(p: ThemedCardProps) {
  const off = pctOff(p.price, p.compareAtPrice);
  return (
    <article className={`group relative text-center ${p.className ?? ""}`}>
      <Link href={p.href} className="relative block aspect-[4/5] overflow-hidden rounded-md bg-muted">
        <Img
          src={p.imageUrl}
          alt={p.title}
          className="h-full w-full object-cover transition duration-700 ease-out group-hover:scale-[1.04]"
        />
        {off > 0 && (
          <span className="absolute left-3 top-3 rounded-full bg-[color-mix(in_srgb,var(--color-card)_90%,transparent)] px-3 py-1 text-[11px] tracking-wide text-foreground">
            Sale
          </span>
        )}
      </Link>
      <FavButton
        favorited={p.favorited}
        busy={p.favoriteBusy}
        onToggle={p.onFavoriteToggle}
        className="absolute right-3 top-3 rounded-full bg-[color-mix(in_srgb,var(--color-card)_85%,transparent)] p-2 text-foreground hover:bg-card"
      />
      <div className="space-y-1 px-2 pt-4">
        <Link href={p.href} className="line-clamp-2 font-display text-lg leading-snug text-foreground">
          {p.title}
        </Link>
        <p className="text-sm text-muted-foreground">
          {off > 0 ? (
            <>
              <span className="text-[color:var(--color-accent-strong)] dark:text-[color:var(--shop-brand-on-dark)]">
                {formatMoney(p.price, p.currency)}
              </span>
              <span className="ml-2 line-through">{formatMoney(p.compareAtPrice!, p.currency)}</span>
            </>
          ) : (
            formatMoney(p.price, p.currency)
          )}
        </p>
        {p.onAddToCart && (
          <button
            type="button"
            disabled={p.addToCartBusy}
            onClick={stop(p.onAddToCart)}
            className="mt-1 text-[11px] uppercase tracking-[0.2em] text-foreground underline-offset-4 hover:underline disabled:opacity-50"
          >
            Add to bag
          </button>
        )}
      </div>
    </article>
  );
}

/* Bazaar - dense card with deal badge, rating, stock chips and add-to-cart (Flowbite free product card). */
function BazaarCard(p: ThemedCardProps) {
  const off = pctOff(p.price, p.compareAtPrice);
  const stock = p.stockQty ?? null;
  const stockChip =
    stock === 0
      ? { label: "Out of stock", tone: "text-danger" }
      : stock != null && stock <= 5
        ? { label: `Only ${stock} left`, tone: "text-warning" }
        : { label: "In stock", tone: "text-muted-foreground" };
  return (
    <article
      className={`flex flex-col rounded-lg border border-border bg-card p-3 shadow-sm sm:p-4 ${p.className ?? ""}`}
    >
      <Link href={p.href} className="block aspect-square overflow-hidden rounded-md bg-muted">
        <Img src={p.imageUrl} alt={p.title} className="h-full w-full object-cover transition hover:scale-[1.03]" />
      </Link>
      <div className="mt-4 flex items-center justify-between gap-2">
        {off > 0 ? (
          <span className="whitespace-nowrap rounded bg-[var(--color-accent-soft)] px-2 py-0.5 text-xs font-medium text-[color:var(--color-accent-strong)] dark:text-[color:var(--shop-brand-on-dark)]">
            <span className="hidden sm:inline">Up to </span>
            {off}% off
          </span>
        ) : p.isNew ? (
          <span className="rounded bg-muted px-2 py-0.5 text-xs font-medium text-foreground">New</span>
        ) : (
          <span />
        )}
        <div className="flex items-center gap-1">
          <Link
            href={p.href}
            aria-label="Quick look"
            className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <Eye className="h-4 w-4" />
          </Link>
          <FavButton
            favorited={p.favorited}
            busy={p.favoriteBusy}
            onToggle={p.onFavoriteToggle}
            className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
          />
        </div>
      </div>
      <Link
        href={p.href}
        className="mt-2 line-clamp-2 text-base font-semibold leading-tight text-foreground hover:underline"
      >
        {p.title}
      </Link>
      {(p.reviewCount ?? 0) > 0 && p.avgRating != null && (
        <div className="mt-2 flex items-center gap-2 text-sm">
          <Stars rating={p.avgRating} />
          <span className="font-medium text-foreground">{p.avgRating.toFixed(1)}</span>
          <span className="text-muted-foreground">({p.reviewCount})</span>
        </div>
      )}
      <ul className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
        <li className={`flex items-center gap-1.5 ${stockChip.tone}`}>
          <Truck className="h-3.5 w-3.5" aria-hidden />
          {stockChip.label}
        </li>
        <li className="flex items-center gap-1.5 text-muted-foreground">
          <ShieldCheck className="h-3.5 w-3.5" aria-hidden />
          Secure checkout
        </li>
      </ul>
      <div className="mt-auto flex flex-col gap-2 pt-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="text-lg font-extrabold leading-tight text-foreground sm:text-xl">
            {formatMoney(p.price, p.currency)}
          </p>
          {off > 0 && (
            <p className="text-xs text-muted-foreground line-through">
              {formatMoney(p.compareAtPrice!, p.currency)}
            </p>
          )}
        </div>
        {p.onAddToCart && (
          <button
            type="button"
            disabled={p.addToCartBusy || stock === 0}
            onClick={stop(p.onAddToCart)}
            className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-lg bg-[var(--shop-brand)] px-3 py-2 text-sm font-medium text-[color:var(--shop-brand-fg)] transition hover:brightness-95 disabled:opacity-50"
          >
            <ShoppingCart className="h-4 w-4" aria-hidden />
            Add to cart
          </button>
        )}
      </div>
    </article>
  );
}

/* Pop - neo-brutalist card: 2px outline, hard shadow that presses in (neobrutalism Card/Button). */
function PopCard(p: ThemedCardProps) {
  const off = pctOff(p.price, p.compareAtPrice);
  return (
    <article
      className={`group relative flex flex-col overflow-hidden rounded-lg border-2 border-foreground bg-card shadow-[var(--pop-shadow)] transition-all hover:translate-x-1 hover:translate-y-1 hover:shadow-none ${p.className ?? ""}`}
    >
      <Link href={p.href} className="relative block aspect-square overflow-hidden border-b-2 border-foreground bg-muted">
        <Img src={p.imageUrl} alt={p.title} className="h-full w-full object-cover" />
        {off > 0 ? (
          <span className="absolute left-3 top-3 -rotate-6 rounded-md border-2 border-foreground bg-[var(--shop-brand)] px-2 py-0.5 text-xs font-extrabold text-[color:var(--shop-brand-fg)] shadow-[var(--pop-shadow-sm)]">
            −{off}%
          </span>
        ) : p.isNew ? (
          <span className="absolute left-3 top-3 -rotate-6 rounded-md border-2 border-black bg-yellow-300 px-2 py-0.5 text-xs font-extrabold text-black shadow-[2px_2px_0_0_#000]">
            NEW
          </span>
        ) : null}
      </Link>
      <FavButton
        favorited={p.favorited}
        busy={p.favoriteBusy}
        onToggle={p.onFavoriteToggle}
        className="absolute right-3 top-3 rounded-full border-2 border-foreground bg-card p-1.5 text-foreground"
      />
      <div className="flex flex-1 flex-col gap-1 p-3 pr-14">
        <Link href={p.href} className="line-clamp-2 text-sm font-bold leading-snug text-foreground">
          {p.title}
        </Link>
        <p className="mt-auto text-base font-extrabold text-foreground sm:text-lg">
          {formatMoney(p.price, p.currency)}
          {off > 0 && (
            <span className="block text-xs font-semibold text-muted-foreground line-through sm:ml-2 sm:inline">
              {formatMoney(p.compareAtPrice!, p.currency)}
            </span>
          )}
        </p>
      </div>
      {p.onAddToCart && (
        <button
          type="button"
          disabled={p.addToCartBusy}
          onClick={stop(p.onAddToCart)}
          aria-label="Add to cart"
          className="absolute bottom-3 right-3 flex h-9 w-9 items-center justify-center rounded-md border-2 border-foreground bg-[var(--shop-brand)] text-[color:var(--shop-brand-fg)] shadow-[var(--pop-shadow-sm)] transition hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none disabled:opacity-50"
        >
          <Plus className="h-5 w-5" aria-hidden />
        </button>
      )}
    </article>
  );
}
