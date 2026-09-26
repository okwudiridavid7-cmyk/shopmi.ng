"use client";

import Link from "next/link";
import { ArrowRight, Store } from "lucide-react";
import { BrandMark } from "@/components/brand-mark";
import { Button } from "@/components/ui/button";
import { useAppName } from "@/hooks/use-branding";

/**
 * Marketing landing (home). Marketplace catalog lives at /explore.
 */
export default function MarketingHomePage() {
  const appName = useAppName();

  return (
    <div className="relative overflow-hidden">
      <div
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          background:
            "radial-gradient(ellipse 70% 50% at 50% -10%, rgba(255,130,46,0.18), transparent 60%), radial-gradient(ellipse 50% 40% at 100% 50%, rgba(255,130,46,0.06), transparent)",
        }}
      />

      <section className="mx-auto flex min-h-[min(78vh,44rem)] w-full max-w-5xl flex-col items-center justify-center px-6 py-16 text-center sm:py-24">
        <BrandMark href="/" className="mb-8 justify-center [&_img]:h-10 sm:[&_img]:h-12" />
        <p className="mb-4 text-xs font-semibold uppercase tracking-[0.2em] text-accent dark:text-accent-on-dark">
          Marketplace for independent shops
        </p>
        <h1 className="max-w-3xl font-display text-4xl font-bold tracking-tight text-foreground sm:text-5xl md:text-6xl">
          Independent shops.
          <span className="block text-muted-foreground">Real checkout.</span>
        </h1>
        <p className="mt-5 max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg">
          {appName} hosts branded storefronts for sellers — and a marketplace
          for buyers who want to discover, pay once, and track orders.
        </p>
        <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
          <Link href="/explore">
            <Button variant="primary" size="lg" className="h-12 gap-2 px-6">
              <Store className="h-4 w-4" aria-hidden />
              Explore marketplace
              <ArrowRight className="h-4 w-4" aria-hidden />
            </Button>
          </Link>
          <Link href="/onboarding">
            <Button variant="outline" size="lg" className="h-12 px-6">
              Start selling
            </Button>
          </Link>
        </div>
      </section>
    </div>
  );
}
