"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { ArrowRight, Store } from "lucide-react";
import type { ProductPublic } from "@vendors/shared-types";
import {
  AnimatedAIChat,
  type ChatResult,
  type ChatSuggestion,
} from "@/components/ui/animated-ai-chat";
import { buttonClasses } from "@/components/ui/button";
import { LiquidMetalButton } from "@/components/ui/liquid-metal-button";
import { MoireField } from "@/components/ui/moire-field";
import { useCategoryTree } from "@/hooks/use-catalog";
import { apiFetch, formatMoney, productImageUrl } from "@/lib/api";
import { useMarketplaceFilters } from "@/stores/ui";

const PLACEHOLDERS = [
  "What are you shopping for today?",
  "Try “sneakers”, “perfume” or “phone case”",
  "Find something special from local shops",
];

/** Lets the "Searching…" state register before the route changes. */
const HANDOFF_MS = 280;

function useDebounced<T>(value: T, delay: number) {
  const [debounced, setDebounced] = React.useState(value);
  React.useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(value), delay);
    return () => window.clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

function Highlight({ children }: { children: React.ReactNode }) {
  const reduceMotion = useReducedMotion();
  return (
    <span className="relative isolate inline-block">
      {children}
      <motion.svg
        aria-hidden="true"
        viewBox="0 0 200 26"
        preserveAspectRatio="none"
        className="pointer-events-none absolute -bottom-[0.14em] -left-[0.08em] -z-10 h-[0.3em] w-[calc(100%+0.22em)] text-[#e3262b] dark:text-[#ff4a4f]"
        initial={reduceMotion ? false : { clipPath: "inset(0 100% 0 0)" }}
        animate={{ clipPath: "inset(0 0% 0 0)" }}
        transition={{ delay: 0.3, duration: 0.55, ease: [0.65, 0, 0.35, 1] }}
      >
        <path
          fill="currentColor"
          d="M7 12.5C58 7.2 128 4.2 197 3.2c2.4.3 2.6 3.6.2 4.2C130 9.6 62 13.4 9.6 18.2 4.2 18.8 2.4 13.6 7 12.5Z"
        />
        <path
          fill="currentColor"
          d="M3.6 19.6C52 14.6 112 11.4 176 9.6c-60 3.6-118 8.4-170.4 13.8-3.6.3-4.6-3.4-2-3.8Z"
        />
        <path
          fill="currentColor"
          d="M16 23.4c42-4.2 82-6.8 126-8.6-40 3.2-80 6.6-124.4 10.6-2.8.2-3.8-1.6-1.6-2Z"
        />
      </motion.svg>
    </span>
  );
}

const HEADLINES: React.ReactNode[] = [
  <>
    <Highlight>Shop</Highlight> items.
  </>,
  <>
    Create your <Highlight>shop</Highlight>.
  </>,
];

function RotatingHeadline() {
  const reduceMotion = useReducedMotion();
  const [index, setIndex] = React.useState(0);

  React.useEffect(() => {
    const timer = window.setInterval(
      () => setIndex((i) => (i + 1) % HEADLINES.length),
      3400
    );
    return () => window.clearInterval(timer);
  }, []);

  return (
    <h1 className="font-display text-[min(2.6rem,8.4vw)] font-bold leading-[1.05] tracking-tight text-foreground sm:text-6xl md:text-7xl">
      <span className="sr-only">Shop items or create your shop in minutes.</span>
      <span aria-hidden="true" className="grid justify-items-center">
        {/* Reserves the widest line so the rotation never shifts the layout. */}
        <span className="invisible col-start-1 row-start-1 whitespace-nowrap">
          Create your shop.
        </span>
        <AnimatePresence initial={false}>
          <motion.span
            key={index}
            className="col-start-1 row-start-1 whitespace-nowrap"
            initial={
              reduceMotion
                ? { opacity: 0 }
                : { opacity: 0, y: "0.45em" }
            }
            animate={{ opacity: 1, y: 0 }}
            exit={
              reduceMotion
                ? { opacity: 0 }
                : { opacity: 0, y: "-0.45em" }
            }
            transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
          >
            {HEADLINES[index]}
          </motion.span>
        </AnimatePresence>
        <span className="mt-[0.14em] block text-foreground">
          In minutes.
        </span>
      </span>
    </h1>
  );
}

/**
 * Home hero: rotating headline, catalog search and the two primary CTAs.
 */
export function HomeHero() {
  const router = useRouter();
  const reduceMotion = useReducedMotion();
  const [query, setQuery] = React.useState("");
  const categoriesQuery = useCategoryTree();
  const debounced = useDebounced(query, 220);

  const resultsQuery = useQuery({
    queryKey: ["catalog", "hero-search", debounced] as const,
    queryFn: () =>
      apiFetch<{ products: ProductPublic[] }>(
        `/api/catalog/products?q=${encodeURIComponent(debounced)}&page=1&limit=5`
      ),
    enabled: debounced.length >= 2,
    staleTime: 30_000,
    placeholderData: (previous) => previous,
  });

  const results = React.useMemo<ChatResult[]>(
    () =>
      (resultsQuery.data?.products ?? []).map((p) => ({
        id: p.id,
        title: p.title,
        subtitle: p.tenant?.name ?? p.location ?? null,
        meta: formatMoney(p.price, p.currency),
        imageUrl: productImageUrl(p.images),
        href: p.tenant
          ? `/shops/${p.tenant.slug}/products/${p.id}`
          : `/catalog/${p.id}`,
      })),
    [resultsQuery.data]
  );

  const suggestions = React.useMemo<ChatSuggestion[]>(
    () =>
      (categoriesQuery.data ?? [])
        .filter((c) => !c.parentId)
        .slice(0, 5)
        .map((c) => ({ id: c.slug, label: c.name })),
    [categoriesQuery.data]
  );

  const handoff = React.useCallback(
    async (param: "q" | "category", value: string) => {
      await new Promise((r) => setTimeout(r, reduceMotion ? 0 : HANDOFF_MS));
      const { clearFilters, setFilter } = useMarketplaceFilters.getState();
      clearFilters();
      setFilter(param, value);
      router.push(`/explore?${param}=${encodeURIComponent(value)}`);
    },
    [reduceMotion, router]
  );

  return (
    <MoireField
      color="#a1a1aa"
      intensity={0.12}
      drift={0.55}
      fade={0.72}
      className="flex min-h-[max(620px,90svh)] w-full items-center justify-center bg-background px-5 py-16 sm:px-8"
    >
      {/* Keeps the headline and search off the fringes without dimming the field around them. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 58% 44% at 50% 50%, var(--color-background) 0%, var(--color-background) 38%, color-mix(in oklab, var(--color-background) 55%, transparent) 72%, transparent 100%)",
        }}
      />

      <section
        data-hero
        className="relative z-10 flex w-full max-w-2xl flex-col items-center text-center"
      >
        <p className="mb-6 inline-flex items-center gap-2 rounded-full border border-border bg-card px-3.5 py-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-accent-strong shadow-sm dark:text-accent-on-dark">
          <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-accent" />
          Shop local. Sell online.
        </p>

        <RotatingHeadline />

        <p className="mt-5 max-w-xl text-lg leading-relaxed text-[color-mix(in_oklab,var(--color-foreground)_82%,transparent)] sm:text-xl">
          Find something you love from independent shops, or open your own
          branded storefront and start taking orders today.
        </p>

        <AnimatedAIChat
          className="relative z-20 mt-9 text-left"
          placeholders={PLACEHOLDERS}
          onQueryChange={setQuery}
          results={results}
          resultsLoading={query !== debounced || resultsQuery.isFetching}
          onResultSelect={(result) => router.push(result.href)}
          suggestions={suggestions}
          onSuggestionSelect={(s) => void handoff("category", s.id)}
          onSubmit={(q) => handoff("q", q)}
        />

        <div className="mt-6 flex w-full flex-col items-stretch gap-3 sm:w-auto sm:flex-row sm:items-center">
          <Link
            href="/explore"
            className={buttonClasses(
              "primary",
              "lg",
              "h-12 w-full gap-2 !rounded-full px-6 shadow-md sm:w-auto"
            )}
          >
            <Store className="h-4 w-4" aria-hidden />
            Explore marketplace
            <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
          <LiquidMetalButton href="/onboarding" label="Create your shop" className="w-full sm:w-auto" />
        </div>
      </section>
    </MoireField>
  );
}
