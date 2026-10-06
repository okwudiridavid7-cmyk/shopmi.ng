"use client";

import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
import { ArrowRight, ArrowUpRight } from "lucide-react";
import type {
  ProductPublic,
  ShopCategoryPublic,
  ShopThemeSettings,
  StoreThemeId,
  TenantPublic,
} from "@vendors/shared-types";
import { formatMoney, productImageUrl } from "@/lib/api";
import type { BannerSlide } from "@/lib/default-banners";
import { safeHref } from "@/lib/safe-url";

export type ThemedHomeProps = {
  themeId: Exclude<StoreThemeId, "classic">;
  tenant: TenantPublic;
  theme: ShopThemeSettings;
  slides: BannerSlide[];
  /** All active products (up to 48), deals first. */
  featured: ProductPublic[];
  promo: ProductPublic[];
  newArrivals: ProductPublic[];
  categorySections: { category: ShopCategoryPublic; products: ProductPublic[] }[];
  renderCard: (p: ProductPublic) => ReactNode;
  onPickCategory: (slug: string) => void;
  /** Filterable product grid, shared by every theme. */
  catalog: ReactNode;
};

function scrollToProducts() {
  document.getElementById("products")?.scrollIntoView({ behavior: "smooth", block: "start" });
}

function slideHref(slide?: BannerSlide): string {
  return safeHref(slide?.ctaUrl) ?? "#products";
}

function img(p?: ProductPublic): string | null {
  return p ? productImageUrl(p.images) : null;
}

function pctOff(p: ProductPublic): number {
  if (p.compareAtPrice == null || p.compareAtPrice <= p.price || p.price <= 0) return 0;
  return Math.round(((p.compareAtPrice - p.price) / p.compareAtPrice) * 100);
}

/** Banner photos are seller-supplied URLs; fall back to a product shot if one breaks. */
function SafeImg({
  src,
  fallback,
  className,
}: {
  src: string;
  fallback?: string | null;
  className?: string;
}) {
  const [current, setCurrent] = useState(src);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    setCurrent(src);
    setFailed(false);
  }, [src]);
  if (failed) return null;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={current}
      alt=""
      className={className}
      onError={() => {
        if (fallback && current !== fallback) setCurrent(fallback);
        else setFailed(true);
      }}
    />
  );
}

/** Fill a row set from `primary`, topping up from `pool`, trimmed to whole rows of `cols`. */
function fullRows(primary: ProductPublic[], pool: ProductPublic[], max: number, cols: number) {
  const seen = new Set(primary.map((p) => p.id));
  const list = [...primary, ...pool.filter((p) => !seen.has(p.id))].slice(0, max);
  if (list.length < cols) return list;
  return list.slice(0, Math.floor(list.length / cols) * cols);
}

function firstSentence(text?: string | null): string | null {
  const t = text?.trim();
  if (!t) return null;
  const m = t.match(/^(.{20,140}?[.!?])(\s|$)/);
  return m ? m[1]! : t.length > 140 ? `${t.slice(0, 137)}…` : t;
}

export function ThemedHome(props: ThemedHomeProps) {
  switch (props.themeId) {
    case "mono":
      return <MonoHome {...props} />;
    case "runway":
      return <RunwayHome {...props} />;
    case "atelier":
      return <AtelierHome {...props} />;
    case "bazaar":
      return <BazaarHome {...props} />;
    case "pop":
      return <PopHome {...props} />;
  }
}

/* ---------------------------------------------------------------- Mono */

function MonoTile({
  product,
  size,
  slug,
}: {
  product: ProductPublic;
  size: "full" | "half";
  slug: string;
}) {
  return (
    <Link
      href={`/shops/${slug}/products/${product.id}`}
      className="group relative block h-full min-h-[220px] w-full overflow-hidden rounded-lg border border-border bg-card transition hover:border-[var(--shop-brand)]"
    >
      {img(product) ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={img(product)!}
          alt={product.title}
          className="absolute inset-0 h-full w-full object-cover transition duration-300 ease-in-out group-hover:scale-105"
        />
      ) : null}
      <div
        className={`absolute bottom-0 left-0 flex w-full px-4 pb-4 ${
          size === "full" ? "lg:px-10 lg:pb-10" : ""
        }`}
      >
        <div className="flex max-w-full items-center rounded-full border border-border bg-white/70 p-1 text-xs font-semibold text-black backdrop-blur-md dark:bg-black/70 dark:text-white">
          <h3 className="mr-4 line-clamp-1 grow pl-2 leading-none tracking-tight">{product.title}</h3>
          <span className="flex-none rounded-full bg-[var(--shop-brand)] p-2 text-[color:var(--shop-brand-fg)]">
            {formatMoney(product.price, product.currency)}
          </span>
        </div>
      </div>
    </Link>
  );
}

function MonoHome({ tenant, featured, catalog }: ThemedHomeProps) {
  const [a, b, c] = featured;
  const strip = featured.slice(3, 15);
  return (
    <div className="space-y-token-8">
      {a && b && c ? (
        <section className="grid gap-4 md:grid-cols-6 md:grid-rows-2 lg:h-[min(calc(100vh-200px),640px)]">
          <div className="aspect-square md:col-span-4 md:row-span-2 md:aspect-auto">
            <MonoTile product={a} size="full" slug={tenant.slug} />
          </div>
          <div className="aspect-square md:col-span-2 md:row-span-1 md:aspect-auto">
            <MonoTile product={b} size="half" slug={tenant.slug} />
          </div>
          <div className="aspect-square md:col-span-2 md:row-span-1 md:aspect-auto">
            <MonoTile product={c} size="half" slug={tenant.slug} />
          </div>
        </section>
      ) : null}

      {strip.length >= 4 ? (
        <section className="full-bleed overflow-hidden pb-2 pt-1">
          <ul className="flex w-max animate-marquee gap-4 [--duration:60s] [--gap:1rem] hover:[animation-play-state:paused]">
            {[...strip, ...strip].map((p, i) => (
              <li key={`${p.id}-${i}`} className="relative aspect-square h-[30vh] max-h-[275px] min-h-[200px] flex-none">
                <MonoTile product={p} size="half" slug={tenant.slug} />
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {catalog}
    </div>
  );
}

/* -------------------------------------------------------------- Runway */

function useRotation(count: number, ms = 6000) {
  const [i, setI] = useState(0);
  useEffect(() => {
    if (count < 2) return;
    const t = window.setInterval(() => setI((v) => (v + 1) % count), ms);
    return () => window.clearInterval(t);
  }, [count, ms]);
  return [i, setI] as const;
}

function RunwayHome({
  tenant,
  slides,
  featured,
  newArrivals,
  categorySections,
  renderCard,
  onPickCategory,
  catalog,
}: ThemedHomeProps) {
  const heroSlides = slides.slice(0, 3);
  const [active, setActive] = useRotation(heroSlides.length);
  const justIn = fullRows(newArrivals, featured, 8, 4);
  const tiles = categorySections.slice(0, 3);
  const story = slides[1];

  return (
    <div className="space-y-16">
      <section className="full-bleed relative -mt-8 h-[78vh] min-h-[520px] overflow-hidden bg-foreground">
        {heroSlides.map((s, i) => (
          <SafeImg
            key={s.id}
            src={s.imageUrl}
            fallback={img(featured[i])}
            className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-1000 ${
              i === active ? "opacity-100" : "opacity-0"
            }`}
          />
        ))}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
        <div className="relative mx-auto flex h-full max-w-7xl flex-col justify-end px-token-4 pb-14 text-white lg:px-token-6">
          <p className="text-xs font-medium uppercase tracking-[0.25em] text-white/80">{tenant.name}</p>
          <h1 className="mt-3 max-w-4xl font-display text-5xl uppercase leading-[0.95] sm:text-7xl lg:text-8xl">
            {heroSlides[active]?.title || tenant.name}
          </h1>
          {heroSlides[active]?.subtitle ? (
            <p className="mt-4 max-w-xl text-sm text-white/85 sm:text-base">{heroSlides[active]!.subtitle}</p>
          ) : null}
          <div className="mt-8 flex items-center justify-between gap-4">
            <a
              href={slideHref(heroSlides[active])}
              className="inline-flex items-center gap-2 bg-white px-7 py-3.5 text-xs font-semibold uppercase tracking-[0.2em] text-black transition hover:bg-white/90"
            >
              {heroSlides[active]?.ctaText || "Shop now"}
            </a>
            {heroSlides.length > 1 ? (
              <div className="flex gap-2">
                {heroSlides.map((s, i) => (
                  <button
                    key={s.id}
                    type="button"
                    aria-label={`Slide ${i + 1}`}
                    onClick={() => setActive(i)}
                    className={`h-1 transition-all ${i === active ? "w-10 bg-white" : "w-6 bg-white/40"}`}
                  />
                ))}
              </div>
            ) : null}
          </div>
        </div>
      </section>

      {justIn.length > 0 ? (
        <section className="space-y-6">
          <div className="flex items-end justify-between gap-4">
            <h2 className="font-display text-4xl sm:text-5xl">Just in</h2>
            <button
              type="button"
              onClick={scrollToProducts}
              className="text-xs font-semibold uppercase tracking-[0.2em] underline underline-offset-8"
            >
              View all
            </button>
          </div>
          <div className="grid grid-cols-2 gap-x-4 gap-y-10 lg:grid-cols-4">
            {justIn.map((p) => (
              <div key={p.id}>{renderCard(p)}</div>
            ))}
          </div>
        </section>
      ) : null}

      {tiles.length > 0 ? (
        <section className="space-y-6">
          <h2 className="font-display text-4xl sm:text-5xl">Shop the edit</h2>
          <div className={`grid gap-4 ${tiles.length >= 3 ? "md:grid-cols-3" : tiles.length === 2 ? "md:grid-cols-2" : ""}`}>
            {tiles.map(({ category, products }) => (
              <button
                key={category.id}
                type="button"
                onClick={() => onPickCategory(category.slug)}
                className="group relative flex aspect-[4/5] items-center justify-center overflow-hidden bg-muted text-left"
              >
                {img(products[0]) ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img loading="lazy" decoding="async"
                    src={img(products[0])!}
                    alt=""
                    className="absolute inset-0 h-full w-full scale-100 object-cover transition-all duration-300 group-hover:scale-[1.03]"
                  />
                ) : null}
                <span className="absolute inset-0 bg-black/25 transition group-hover:bg-black/35" />
                <span className="relative z-10 flex flex-col items-center gap-4 text-center text-white">
                  <span className="font-display text-3xl uppercase sm:text-4xl">{category.name}</span>
                  <span className="bg-white px-5 py-2.5 text-xs font-semibold uppercase tracking-[0.2em] text-black">
                    Shop now
                  </span>
                </span>
              </button>
            ))}
          </div>
        </section>
      ) : null}

      {story?.title ? (
        <section className="full-bleed relative h-[60vh] min-h-[380px] overflow-hidden">
          <SafeImg src={story.imageUrl} fallback={img(featured[1])} className="absolute inset-0 h-full w-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-r from-black/65 to-black/0" />
          <div className="relative mx-auto flex h-full max-w-7xl flex-col justify-center px-token-4 text-white lg:px-token-6">
            <h2 className="max-w-xl font-display text-5xl uppercase leading-none sm:text-6xl">{story.title}</h2>
            {story.subtitle ? <p className="mt-4 max-w-md text-sm text-white/85">{story.subtitle}</p> : null}
            <a
              href={slideHref(story)}
              className="mt-6 inline-flex w-max border border-white px-6 py-3 text-xs font-semibold uppercase tracking-[0.2em] transition hover:bg-white hover:text-black"
            >
              {story.ctaText || "Discover"}
            </a>
          </div>
        </section>
      ) : null}

      {catalog}
    </div>
  );
}

/* ------------------------------------------------------------- Atelier */

function AtelierHome({
  tenant,
  theme,
  slides,
  featured,
  newArrivals,
  categorySections,
  renderCard,
  onPickCategory,
  catalog,
}: ThemedHomeProps) {
  const hero = slides[0];
  const headline = hero?.title || firstSentence(theme.shopDescription) || tenant.name;
  const lead = hero?.subtitle || null;
  const tiles = categorySections.slice(0, 2);
  const picks = fullRows(newArrivals, featured, 4, 4);
  const storyImage = slides[1]?.imageUrl ?? img(featured[0]);

  return (
    <div className="space-y-20">
      <section className="space-y-10 pt-4">
        <div className="grid items-end gap-6 md:grid-cols-[2fr_1fr]">
          <h1 className="font-display text-4xl leading-[1.1] text-foreground sm:text-5xl lg:text-6xl">
            {headline}
          </h1>
          <div className="space-y-1 md:pb-2">
            {lead ? <p className="text-lg text-muted-foreground">{lead}</p> : null}
            <a
              href={slideHref(hero)}
              className="inline-block border-b border-foreground pb-0.5 text-lg text-foreground transition hover:opacity-70"
            >
              {hero?.ctaText || "Explore now"}
            </a>
          </div>
        </div>
        {hero ? (
          <SafeImg
            src={hero.imageUrl}
            fallback={img(featured[0])}
            className="aspect-[4/3] w-full rounded-md object-cover sm:aspect-[16/7]"
          />
        ) : null}
      </section>

      {tiles.length > 0 ? (
        <section className="space-y-8">
          <h2 className="font-display text-3xl sm:text-4xl">Our products</h2>
          <div className="grid gap-8 md:grid-cols-2">
            {tiles.map(({ category, products }) => (
              <button
                key={category.id}
                type="button"
                onClick={() => onPickCategory(category.slug)}
                className="group space-y-4 text-left"
              >
                <span className="block aspect-[4/3] overflow-hidden rounded-md bg-muted">
                  {img(products[0]) ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img loading="lazy" decoding="async"
                      src={img(products[0])!}
                      alt=""
                      className="h-full w-full object-cover transition duration-700 group-hover:scale-[1.03]"
                    />
                  ) : null}
                </span>
                <span className="block text-xl text-foreground">{category.name}</span>
              </button>
            ))}
          </div>
        </section>
      ) : null}

      {theme.shopDescription?.trim() ? (
        <section className="grid items-center gap-10 md:grid-cols-2">
          {storyImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img loading="lazy" decoding="async" src={storyImage} alt="" className="aspect-[4/5] w-full rounded-md object-cover" />
          ) : null}
          <div className="space-y-5">
            <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground">About</p>
            <h2 className="font-display text-3xl leading-tight sm:text-4xl">{tenant.name}</h2>
            <p className="whitespace-pre-line text-base leading-relaxed text-muted-foreground">
              {theme.shopDescription.trim()}
            </p>
            <Link
              href={`/shops/${tenant.slug}/contact`}
              className="inline-block border-b border-foreground pb-0.5 text-foreground transition hover:opacity-70"
            >
              Get in touch
            </Link>
          </div>
        </section>
      ) : null}

      {picks.length > 0 ? (
        <section className="space-y-8">
          <div className="flex items-center justify-between gap-4">
            <h2 className="font-display text-3xl sm:text-4xl">
              {newArrivals.length ? "New this season" : "Favourites"}
            </h2>
            <button
              type="button"
              onClick={scrollToProducts}
              className="rounded-sm bg-foreground px-4 py-2 text-sm text-background transition hover:opacity-90"
            >
              View all
            </button>
          </div>
          <div className="grid grid-cols-2 gap-x-6 gap-y-10 md:grid-cols-4">
            {picks.map((p) => (
              <div key={p.id}>{renderCard(p)}</div>
            ))}
          </div>
        </section>
      ) : null}

      {catalog}
    </div>
  );
}

/* -------------------------------------------------------------- Bazaar */

function BazaarHome({
  tenant,
  slides,
  featured,
  promo,
  categorySections,
  renderCard,
  onPickCategory,
  catalog,
}: ThemedHomeProps) {
  const deals = (promo.length ? promo : featured).slice(0, 2);
  const dealsRow = fullRows(promo, [], 8, 4);
  const heroSlides = slides.slice(0, 4);
  const [active, setActive] = useRotation(heroSlides.length);
  const hero = heroSlides[active];

  return (
    <div className="space-y-token-8">
      <section className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="relative min-h-[260px] min-w-0 overflow-hidden rounded-lg bg-foreground sm:min-h-[320px]">
          {heroSlides.map((s, i) => (
            <SafeImg
              key={s.id}
              src={s.imageUrl}
              fallback={img(featured[i])}
              className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-700 ${
                i === active ? "opacity-100" : "opacity-0"
              }`}
            />
          ))}
          <div className="absolute inset-0 bg-gradient-to-r from-black/75 via-black/40 to-transparent" />
          <div className="relative flex h-full min-h-[inherit] max-w-md flex-col justify-center gap-3 p-6 text-white sm:p-10">
            <h1 className="font-display text-3xl leading-tight sm:text-4xl">
              {hero?.title || tenant.name}
            </h1>
            {hero?.subtitle ? <p className="text-sm text-white/85 sm:text-base">{hero.subtitle}</p> : null}
            <a
              href={slideHref(hero)}
              className="mt-2 inline-flex w-fit items-center gap-2 rounded-lg bg-[var(--shop-brand)] px-5 py-2.5 text-sm font-medium text-[color:var(--shop-brand-fg)] transition hover:opacity-90"
            >
              {hero?.ctaText || "Shop now"} <ArrowRight className="h-4 w-4" />
            </a>
          </div>
          {heroSlides.length > 1 ? (
            <div className="absolute bottom-4 left-6 flex gap-2 sm:left-10">
              {heroSlides.map((s, i) => (
                <button
                  key={s.id}
                  type="button"
                  aria-label={`Show slide ${i + 1}`}
                  onClick={() => setActive(i)}
                  className={`h-2 rounded-full transition-all ${i === active ? "w-6 bg-white" : "w-2 bg-white/50"}`}
                />
              ))}
            </div>
          ) : null}
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
          {deals.map((p) => {
            const off = pctOff(p);
            return (
              <Link
                key={p.id}
                href={`/shops/${tenant.slug}/products/${p.id}`}
                className="group flex items-center gap-4 rounded-lg border border-border bg-card p-4 shadow-sm transition hover:shadow-md"
              >
                <span className="h-24 w-24 shrink-0 overflow-hidden rounded-md bg-muted">
                  {img(p) ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img loading="lazy" decoding="async" src={img(p)!} alt="" className="h-full w-full object-cover transition group-hover:scale-105" />
                  ) : null}
                </span>
                <span className="min-w-0 space-y-1">
                  <span className="inline-block rounded bg-[var(--color-accent-soft)] px-2 py-0.5 text-xs font-medium text-[color:var(--color-accent-strong)] dark:text-[color:var(--shop-brand-on-dark)]">
                    {off > 0 ? `Up to ${off}% off` : "New in"}
                  </span>
                  <span className="line-clamp-2 block text-sm font-semibold text-foreground">{p.title}</span>
                  <span className="block text-lg font-extrabold text-foreground">
                    {formatMoney(p.price, p.currency)}
                  </span>
                </span>
              </Link>
            );
          })}
        </div>
      </section>

      {categorySections.length > 0 ? (
        <section className="space-y-4">
          <h2 className="font-display text-xl text-foreground sm:text-2xl">Shop by category</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {categorySections.map(({ category, products }) => (
              <button
                key={category.id}
                type="button"
                onClick={() => onPickCategory(category.slug)}
                className="flex items-center gap-3 rounded-lg border border-border bg-card p-3 text-left shadow-sm transition hover:border-[var(--shop-brand)]"
              >
                <span className="h-12 w-12 shrink-0 overflow-hidden rounded-md bg-muted">
                  {img(products[0]) ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img loading="lazy" decoding="async" src={img(products[0])!} alt="" className="h-full w-full object-cover" />
                  ) : null}
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-sm font-semibold text-foreground">{category.name}</span>
                  <span className="text-xs text-muted-foreground">
                    {products.length} item{products.length === 1 ? "" : "s"}
                  </span>
                </span>
              </button>
            ))}
          </div>
        </section>
      ) : null}

      {dealsRow.length > 0 ? (
        <section className="space-y-4">
          <div className="flex items-end justify-between gap-4">
            <h2 className="font-display text-xl text-foreground sm:text-2xl">Today&apos;s deals</h2>
            <button
              type="button"
              onClick={scrollToProducts}
              className="inline-flex items-center gap-1 text-sm font-medium text-[color:var(--color-accent-strong)] hover:underline dark:text-[color:var(--shop-brand-on-dark)]"
            >
              See all <ArrowRight className="h-4 w-4" />
            </button>
          </div>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {dealsRow.map((p) => (
              <div key={p.id} className="flex">{renderCard(p)}</div>
            ))}
          </div>
        </section>
      ) : null}

      {catalog}
    </div>
  );
}

/* ----------------------------------------------------------------- Pop */

function PopHome({
  tenant,
  theme,
  slides,
  featured,
  newArrivals,
  categorySections,
  renderCard,
  onPickCategory,
  catalog,
}: ThemedHomeProps) {
  const hero = slides[0];
  const collage = featured.slice(0, 3);
  const drops = fullRows(newArrivals, featured, 8, 4);
  const ticker = categorySections.length
    ? categorySections.map((s) => s.category.name)
    : featured.slice(0, 6).map((p) => p.title);
  const btn =
    "inline-flex items-center gap-2 rounded-md border-2 border-foreground px-5 py-3 text-sm font-bold shadow-[var(--pop-shadow)] transition-all hover:translate-x-1 hover:translate-y-1 hover:shadow-none";
  const tilts = ["-rotate-6", "rotate-3", "-rotate-2"];
  const offsets = ["left-0 top-6", "right-0 top-0", "left-1/4 bottom-0"];

  return (
    <div className="space-y-14">
      <section
        className="relative overflow-hidden rounded-lg border-2 border-foreground bg-card p-6 shadow-[var(--pop-shadow)] sm:p-10"
        style={{
          backgroundImage:
            "linear-gradient(to right, color-mix(in srgb, var(--color-foreground) 7%, transparent) 1px, transparent 1px), linear-gradient(to bottom, color-mix(in srgb, var(--color-foreground) 7%, transparent) 1px, transparent 1px)",
          backgroundSize: "40px 40px",
        }}
      >
        <div className="grid items-center gap-10 md:grid-cols-2">
          <div className="space-y-6">
            <span className="inline-block -rotate-2 rounded-md border-2 border-black bg-yellow-300 px-3 py-1 text-xs font-extrabold uppercase text-black shadow-[2px_2px_0_0_#000]">
              {featured.length} product{featured.length === 1 ? "" : "s"} at {tenant.name}
            </span>
            <h1 className="text-4xl font-extrabold leading-[1.05] tracking-tight text-foreground sm:text-6xl">
              {hero?.title || tenant.name}
            </h1>
            {hero?.subtitle || theme.shopDescription ? (
              <p className="max-w-md text-base font-medium text-muted-foreground">
                {hero?.subtitle || firstSentence(theme.shopDescription)}
              </p>
            ) : null}
            <div className="flex flex-wrap gap-3">
              <a
                href={slideHref(hero)}
                className={`${btn} bg-[var(--shop-brand)] text-[color:var(--shop-brand-fg)]`}
              >
                {hero?.ctaText || "Shop now"} <ArrowUpRight className="h-4 w-4" />
              </a>
              <Link href={`/shops/${tenant.slug}/contact`} className={`${btn} bg-card text-foreground`}>
                Say hi
              </Link>
            </div>
          </div>
          {collage.length > 0 ? (
            <div className="relative mx-auto h-72 w-full max-w-sm sm:h-80">
              {collage.map((p, i) => (
                <Link
                  key={p.id}
                  href={`/shops/${tenant.slug}/products/${p.id}`}
                  className={`absolute ${offsets[i]} ${tilts[i]} w-40 overflow-hidden rounded-lg border-2 border-foreground bg-card shadow-[var(--pop-shadow)] transition hover:rotate-0 sm:w-44`}
                >
                  {img(p) ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={img(p)!} alt={p.title} className="aspect-square w-full object-cover" />
                  ) : null}
                  <span className="block border-t-2 border-foreground bg-[var(--shop-brand)] px-2 py-1 text-xs font-extrabold text-[color:var(--shop-brand-fg)]">
                    {formatMoney(p.price, p.currency)}
                  </span>
                </Link>
              ))}
            </div>
          ) : null}
        </div>
      </section>

      {ticker.length > 0 ? (
        <section className="full-bleed overflow-hidden border-y-[3px] border-foreground bg-yellow-300 py-3 text-black">
          <div className="flex w-max animate-marquee gap-8 text-lg font-extrabold uppercase [--duration:30s] [--gap:2rem]">
            {[...ticker, ...ticker, ...ticker, ...ticker].map((t, i) => (
              <span key={i} className="flex items-center gap-8 whitespace-nowrap">
                {t} <span aria-hidden>✱</span>
              </span>
            ))}
          </div>
        </section>
      ) : null}

      {categorySections.length > 0 ? (
        <section className="flex flex-wrap gap-3">
          {categorySections.map(({ category }) => (
            <button
              key={category.id}
              type="button"
              onClick={() => onPickCategory(category.slug)}
              className="rounded-md border-2 border-foreground bg-card px-4 py-2 text-sm font-bold text-foreground shadow-[var(--pop-shadow-sm)] transition hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none"
            >
              {category.name}
            </button>
          ))}
        </section>
      ) : null}

      {drops.length > 0 ? (
        <section className="space-y-6">
          <h2 className="text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
            {newArrivals.length ? "Fresh drops" : "Top picks"}
          </h2>
          <div className="grid grid-cols-2 gap-5 md:grid-cols-4">
            {drops.map((p) => (
              <div key={p.id} className="flex">{renderCard(p)}</div>
            ))}
          </div>
        </section>
      ) : null}

      {catalog}
    </div>
  );
}
