"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { ArrowRight, Compass, Search, Store, Truck } from "lucide-react";
import type { ProductPublic } from "@vendors/shared-types";
import {
  AnimatedAIChat,
  type AnimatedAIChatHandle,
  type ChatCommand,
  type ChatResult,
} from "@/components/ui/animated-ai-chat";
import { Button } from "@/components/ui/button";
import { MoireField } from "@/components/ui/moire-field";
import { apiFetch, formatMoney, productImageUrl } from "@/lib/api";
import { useMarketplaceFilters } from "@/stores/ui";

const COMMANDS: ChatCommand[] = [
  {
    icon: <Search />,
    label: "Search items",
    description: "Find products across every shop",
    prefix: "/search",
    takesQuery: true,
  },
  {
    icon: <Compass />,
    label: "Explore marketplace",
    description: "Browse shops, categories and new arrivals",
    prefix: "/explore",
    status: "Opening the marketplace",
  },
  {
    icon: <Store />,
    label: "Start selling",
    description: "Create your shop in a few steps",
    prefix: "/sell",
    status: "Setting up your shop",
  },
  {
    icon: <Truck />,
    label: "Track an order",
    description: "See where your purchases are",
    prefix: "/orders",
    status: "Opening your orders",
  },
];

const COMMAND_ROUTES: Record<string, string> = {
  "/explore": "/explore",
  "/sell": "/onboarding",
  "/orders": "/buyer/orders",
};

const PLACEHOLDERS = [
  "Search sneakers, skincare, gadgets…",
  "Try “ankara dress” or “wireless earbuds”",
  "Type / to explore, sell or track an order",
];

/** Lets the chat's status line register before the route changes. */
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
  return (
    <span className="relative isolate inline-block text-accent dark:text-accent-on-dark">
      <span
        aria-hidden="true"
        className="absolute inset-x-[-0.06em] bottom-[0.08em] -z-10 h-[0.3em] rounded-sm bg-[color-mix(in_oklab,var(--color-accent)_22%,transparent)]"
      />
      {children}
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
    <h1 className="font-display text-[2.6rem] font-bold leading-[1.05] tracking-tight text-foreground sm:text-6xl md:text-7xl">
      <span className="sr-only">Shop items or create your shop — in minutes.</span>
      <span aria-hidden="true" className="grid justify-items-center">
        {/* Reserves the widest line so the rotation never shifts the layout. */}
        <span className="invisible col-start-1 row-start-1">
          Create your shop.
        </span>
        <AnimatePresence initial={false}>
          <motion.span
            key={index}
            className="col-start-1 row-start-1 whitespace-nowrap"
            initial={
              reduceMotion
                ? { opacity: 0 }
                : { opacity: 0, y: "0.45em", filter: "blur(8px)" }
            }
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            exit={
              reduceMotion
                ? { opacity: 0 }
                : { opacity: 0, y: "-0.45em", filter: "blur(8px)" }
            }
            transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
          >
            {HEADLINES[index]}
          </motion.span>
        </AnimatePresence>
        <span className="block text-muted-foreground">In minutes.</span>
      </span>
    </h1>
  );
}

/**
 * Marketing landing (home). Marketplace catalog lives at /explore.
 */
export default function MarketingHomePage() {
  const router = useRouter();
  const reduceMotion = useReducedMotion();
  const chatRef = React.useRef<AnimatedAIChatHandle>(null);
  const [query, setQuery] = React.useState("");
  const debounced = useDebounced(query, 220);

  React.useEffect(() => {
    router.prefetch("/explore");
    router.prefetch("/onboarding");
  }, [router]);

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

  const handleSubmit = React.useCallback(
    async (q: string, command: ChatCommand | null) => {
      await new Promise((r) => setTimeout(r, reduceMotion ? 0 : HANDOFF_MS));
      const route = command ? COMMAND_ROUTES[command.prefix] : undefined;
      if (route && !(command?.prefix === "/explore" && q)) {
        router.push(route);
        return;
      }
      const { clearFilters, setFilter } = useMarketplaceFilters.getState();
      clearFilters();
      setFilter("q", q);
      router.push(q ? `/explore?q=${encodeURIComponent(q)}` : "/explore");
    },
    [reduceMotion, router]
  );

  const replay =
    (command: string) => (event: React.MouseEvent<HTMLAnchorElement>) => {
      if (
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey
      )
        return;
      event.preventDefault();
      chatRef.current?.run(command);
    };

  return (
    <MoireField
      accent
      intensity={0.24}
      drift={0.55}
      fade={0.45}
      className="flex min-h-[max(620px,90svh)] w-full items-center justify-center bg-background px-5 py-16 sm:px-8"
    >
      <style>{`
        @keyframes hero-rise {
          from { opacity: 0; transform: translateY(14px); }
          to   { opacity: 1; transform: none; }
        }
        [data-hero] > * { animation: hero-rise .6s cubic-bezier(.22,1,.36,1) both; }
        [data-hero] > :nth-child(2) { animation-delay: 70ms; }
        [data-hero] > :nth-child(3) { animation-delay: 140ms; }
        [data-hero] > :nth-child(4) { animation-delay: 210ms; }
        [data-hero] > :nth-child(5) { animation-delay: 280ms; }
        @media (prefers-reduced-motion: reduce) {
          [data-hero] > * { animation: none; }
        }
      `}</style>

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
        <p className="mb-6 inline-flex items-center gap-2 rounded-full border border-border bg-[color-mix(in_oklab,var(--color-card)_70%,transparent)] px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-accent backdrop-blur-sm dark:text-accent-on-dark">
          <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-accent" />
          Marketplace for independent shops
        </p>

        <RotatingHeadline />

        <p className="mt-5 max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg">
          Find something you love from independent shops — or open your own
          branded storefront and start taking orders today.
        </p>

        <AnimatedAIChat
          ref={chatRef}
          className="mt-9 text-left"
          commands={COMMANDS}
          placeholders={PLACEHOLDERS}
          onQueryChange={setQuery}
          results={results}
          resultsLoading={
            query !== debounced || resultsQuery.isFetching
          }
          onResultSelect={(result) => router.push(result.href)}
          onSubmit={handleSubmit}
        />

        <div className="mt-6 flex w-full flex-col items-stretch gap-3 sm:w-auto sm:flex-row sm:items-center">
          <Link href="/explore" onClick={replay("/explore")}>
            <Button
              variant="primary"
              size="lg"
              className="h-12 w-full gap-2 rounded-full px-6 shadow-md sm:w-auto"
            >
              <Store className="h-4 w-4" aria-hidden />
              Explore marketplace
              <ArrowRight className="h-4 w-4" aria-hidden />
            </Button>
          </Link>
          <Link href="/onboarding" onClick={replay("/sell")}>
            <Button
              variant="outline"
              size="lg"
              className="h-12 w-full rounded-full px-6 sm:w-auto"
            >
              Start selling
            </Button>
          </Link>
        </div>
      </section>
    </MoireField>
  );
}
