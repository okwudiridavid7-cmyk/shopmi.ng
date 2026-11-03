"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  CheckLine,
  MarketingEyebrow,
  MarketingHeading,
  MarketingSection,
} from "@/components/marketing-sections";
import { useAppName } from "@/hooks/use-branding";

export default function AboutPage() {
  const appName = useAppName() || "Shopmi.ng";

  return (
    <div>
      <MarketingSection>
        <div className="mx-auto max-w-2xl text-center">
          <MarketingEyebrow>About</MarketingEyebrow>
          <MarketingHeading className="mt-token-3">
            Built for Nigerian shops
          </MarketingHeading>
          <p className="mt-token-3 text-sm text-muted-foreground sm:text-base">
            {appName} helps sellers open a storefront, take Paystack payments,
            and fulfil orders — while buyers shop with clear invoices and order
            tracking.
          </p>
        </div>

        <div className="mx-auto mt-10 grid max-w-4xl gap-token-5 sm:grid-cols-2">
          <div className="rounded-lg border border-border bg-card p-token-6 shadow-sm">
            <h2 className="font-display text-lg text-foreground">For sellers</h2>
            <ul className="mt-token-4 space-y-token-3">
              <CheckLine>Your own shop URL, branding, and product catalogue.</CheckLine>
              <CheckLine>Orders, invoices, and payouts in one workspace.</CheckLine>
              <CheckLine>Plans that scale from a first listing to a team.</CheckLine>
            </ul>
            <Link href="/sellers" className="mt-token-6 inline-block">
              <Button variant="outline">Sell on {appName}</Button>
            </Link>
          </div>
          <div className="rounded-lg border border-border bg-card p-token-6 shadow-sm">
            <h2 className="font-display text-lg text-foreground">For buyers</h2>
            <ul className="mt-token-4 space-y-token-3">
              <CheckLine>Discover independent shops in one marketplace.</CheckLine>
              <CheckLine>Secure checkout with order history and PDF invoices.</CheckLine>
              <CheckLine>Favourites and account preferences you control.</CheckLine>
            </ul>
            <Link href="/buyers" className="mt-token-6 inline-block">
              <Button variant="outline">Shop with {appName}</Button>
            </Link>
          </div>
        </div>

        <div className="mx-auto mt-10 max-w-xl rounded-lg border border-border bg-muted/40 p-token-6 text-center">
          <p className="text-sm text-muted-foreground">
            Questions about the platform, privacy, or partnerships? We’re happy
            to help.
          </p>
          <div className="mt-token-4 flex flex-wrap justify-center gap-token-3">
            <Link href="/contact">
              <Button variant="primary">Contact us</Button>
            </Link>
            <Link href="/support">
              <Button variant="outline">Support</Button>
            </Link>
          </div>
        </div>
      </MarketingSection>
    </div>
  );
}
