"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  BadgeCheck,
  Handshake,
  Package,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Store,
  Truck,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { BrandMark } from "@/components/brand-mark";
import {
  CheckLine,
  FeatureCard,
  MarketingEyebrow,
  MarketingHeading,
  MarketingSection,
} from "@/components/marketing-sections";
import { apiFetch } from "@/lib/api";
import { useAppName, usePlatformBranding } from "@/hooks/use-branding";

type CatalogStats = {
  shopCount: number;
  productCount: number;
  orderCount: number;
};

const VALUE_CARDS: {
  icon: LucideIcon;
  title: string;
  body: string;
}[] = [
  {
    icon: Store,
    title: "Your storefront, your brand",
    body: "Launch a shop with its own look, catalog, and policies — without bolting a marketplace onto someone else’s template.",
  },
  {
    icon: Smartphone,
    title: "Built for phones first",
    body: "Sellers manage inventory from a handset; buyers check out without wrestling a desktop layout.",
  },
  {
    icon: ShieldCheck,
    title: "Payments you can trust",
    body: "Paystack checkout, clear invoices, and fulfillment status keep money and expectations aligned on every sale.",
  },
];

const TOOLS: {
  icon: LucideIcon;
  title: string;
  body: string;
}[] = [
  {
    icon: Sparkles,
    title: "AI listing help",
    body: "Optional description and watermark tools when you need copy or product images that look consistent.",
  },
  {
    icon: BadgeCheck,
    title: "Verified shops",
    body: "Platform review issues a verified tick so buyers can spot sellers who passed our checks.",
  },
  {
    icon: Package,
    title: "Orders & invoices",
    body: "Paid orders, receipts, and status updates stay in one place for buyers and sellers.",
  },
  {
    icon: Truck,
    title: "Fulfillment clarity",
    body: "Delivery expectations and shop policies sit next to the product — not buried in fine print.",
  },
];

function formatStat(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}k+`;
  return String(n);
}

export default function AboutPage() {
  const appName = useAppName() || "Shopmi.ng";
  const support = usePlatformBranding().data?.supportEmail;
  const statsQ = useQuery({
    queryKey: ["catalog", "stats"] as const,
    queryFn: async () => {
      const res = await apiFetch<{ stats: CatalogStats }>("/api/catalog/stats");
      return res.stats;
    },
    staleTime: 60_000,
  });

  const stats = statsQ.data;

  return (
    <div className="pb-0">
      {/* Hero — Hostinger/Café One style: centered claim + dual CTA */}
      <section className="relative overflow-hidden border-b border-border bg-gradient-to-b from-accent-soft/40 via-background to-background px-token-4 pb-20 pt-16 sm:px-token-6 sm:pt-20">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-64 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-accent/15 via-transparent to-transparent" />
        <div className="relative mx-auto flex max-w-3xl flex-col items-center text-center">
          <div className="mb-token-6">
            <BrandMark />
          </div>
          <MarketingEyebrow>About {appName}</MarketingEyebrow>
          <h1 className="mt-token-4 font-display text-4xl leading-[1.1] tracking-tight text-foreground sm:text-5xl lg:text-6xl">
            Your idea in a shop.{" "}
            <span className="text-accent">Made easy.</span>
          </h1>
          <p className="mt-token-5 max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg">
            {appName} is the marketplace for independent sellers who want branded
            storefronts, real checkout, and buyers who care about the store
            behind the product.
          </p>
          <div className="mt-token-8 flex flex-wrap items-center justify-center gap-token-3">
            <Link href="/signup">
              <Button variant="primary" size="lg">
                Open a shop
              </Button>
            </Link>
            <Link href="/">
              <Button variant="outline" size="lg">
                Browse the marketplace
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Value props — 3 cards */}
      <MarketingSection muted>
        <div className="mx-auto max-w-2xl text-center">
          <MarketingEyebrow>Why sellers choose us</MarketingEyebrow>
          <MarketingHeading className="mt-token-3">
            Tools for every step of a sale
          </MarketingHeading>
          <p className="mt-token-3 text-sm text-muted-foreground sm:text-base">
            From first listing to paid order — without a wall of unused features
            on day one.
          </p>
        </div>
        <div className="mt-10 grid gap-token-5 sm:grid-cols-3">
          {VALUE_CARDS.map((card) => (
            <FeatureCard key={card.title} {...card} />
          ))}
        </div>
      </MarketingSection>

      {/* Stats band */}
      <MarketingSection>
        <div className="rounded-lg border border-border bg-card px-token-6 py-10 shadow-sm sm:px-token-8">
          <div className="mx-auto max-w-2xl text-center">
            <MarketingEyebrow>On the platform</MarketingEyebrow>
            <MarketingHeading className="mt-token-3">
              Live marketplace numbers
            </MarketingHeading>
            <p className="mt-token-3 text-sm text-muted-foreground">
              Counts from active shops and listings — updated as {appName} grows.
            </p>
          </div>
          <dl className="mt-10 grid gap-token-8 sm:grid-cols-3">
            <div className="text-center">
              <dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Shops live
              </dt>
              <dd className="mt-token-2 font-display text-4xl text-foreground sm:text-5xl">
                {stats ? formatStat(stats.shopCount) : "—"}
              </dd>
            </div>
            <div className="text-center">
              <dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Products listed
              </dt>
              <dd className="mt-token-2 font-display text-4xl text-foreground sm:text-5xl">
                {stats ? formatStat(stats.productCount) : "—"}
              </dd>
            </div>
            <div className="text-center">
              <dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Orders processed
              </dt>
              <dd className="mt-token-2 font-display text-4xl text-foreground sm:text-5xl">
                {stats ? formatStat(stats.orderCount) : "—"}
              </dd>
            </div>
          </dl>
        </div>
      </MarketingSection>

      {/* Feature grid — Hostinger “everything you need” */}
      <MarketingSection muted>
        <div className="mx-auto max-w-2xl text-center">
          <MarketingEyebrow>Everything you need</MarketingEyebrow>
          <MarketingHeading className="mt-token-3">
            Sell with confidence online
          </MarketingHeading>
        </div>
        <div className="mt-10 grid gap-token-4 sm:grid-cols-2 lg:grid-cols-4">
          {TOOLS.map(({ icon: Icon, title, body }) => (
            <div
              key={title}
              className="rounded-lg border border-border bg-background p-token-5"
            >
              <Icon className="h-5 w-5 text-accent" aria-hidden />
              <h3 className="mt-token-3 font-medium text-foreground">{title}</h3>
              <p className="mt-token-2 text-sm leading-relaxed text-muted-foreground">
                {body}
              </p>
            </div>
          ))}
        </div>
      </MarketingSection>

      {/* Split — Café One / Hostinger business pitch */}
      <MarketingSection>
        <div className="grid items-center gap-10 lg:grid-cols-2">
          <div>
            <MarketingEyebrow>For growing brands</MarketingEyebrow>
            <MarketingHeading className="mt-token-3">
              One marketplace. Your identity intact.
            </MarketingHeading>
            <p className="mt-token-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
              Most sellers don’t need another bloated suite. They need a
              storefront that looks like their brand, payments that clear, and
              traffic without losing their voice.
            </p>
            <ul className="mt-token-6 space-y-token-3">
              <CheckLine>Branded shop on your own subdomain</CheckLine>
              <CheckLine>Paystack checkout and order invoices</CheckLine>
              <CheckLine>Verification, campaigns, and team seats when you need them</CheckLine>
            </ul>
            <div className="mt-token-8">
              <Link href="/signup">
                <Button variant="primary">Get started</Button>
              </Link>
            </div>
          </div>
          <div className="relative overflow-hidden rounded-lg border border-border bg-muted/60 p-token-8">
            <div className="absolute -bottom-8 -left-8 h-40 w-40 rounded-full bg-accent/20 blur-2xl" />
            <div className="relative space-y-token-4">
              <Handshake className="h-8 w-8 text-accent" aria-hidden />
              <p className="font-display text-2xl text-foreground">
                Built for the middle ground — serious enough for daily sales,
                light enough to set up between deliveries.
              </p>
              <p className="text-sm text-muted-foreground">
                Whether you are listing your first SKU or scaling a catalog,
                {appName} keeps the seller workspace and the buyer marketplace
                in sync.
              </p>
            </div>
          </div>
        </div>
      </MarketingSection>

      {/* Bottom CTA banner */}
      <section className="border-t border-border bg-foreground px-token-4 py-16 sm:px-token-6 sm:py-20">
        <div className="mx-auto flex max-w-4xl flex-col items-center text-center">
          <h2 className="font-display text-3xl text-background sm:text-4xl">
            Imagined it. Now list it.
          </h2>
          <p className="mt-token-4 max-w-lg text-sm text-background/70 sm:text-base">
            Open a shop, browse as a buyer, or ask us anything — we reply to the
            inbox you use on the contact form.
          </p>
          <div className="mt-token-8 flex flex-wrap justify-center gap-token-3">
            <Link href="/signup">
              <Button
                variant="primary"
                size="lg"
                className="bg-accent hover:bg-accent-deep"
              >
                Create your shop
              </Button>
            </Link>
            <Link href="/contact">
              <Button
                variant="outline"
                size="lg"
                className="border-background/30 bg-transparent text-background hover:bg-background/10 hover:text-background"
              >
                Contact us
              </Button>
            </Link>
            {support ? (
              <a href={`mailto:${support}`}>
                <Button
                  variant="outline"
                  size="lg"
                  className="border-background/30 bg-transparent text-background hover:bg-background/10 hover:text-background"
                >
                  Email support
                </Button>
              </a>
            ) : null}
          </div>
        </div>
      </section>
    </div>
  );
}
