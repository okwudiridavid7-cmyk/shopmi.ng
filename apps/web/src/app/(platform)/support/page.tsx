"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  CheckLine,
  MarketingEyebrow,
  MarketingHeading,
  MarketingSection,
} from "@/components/marketing-sections";
import { useAppName, usePlatformBranding } from "@/hooks/use-branding";

export default function SupportPage() {
  const appName = useAppName() || "Shopmi.ng";
  const email = usePlatformBranding().data?.supportEmail ?? "support@shopmi.ng";

  return (
    <div>
      <MarketingSection>
        <div className="mx-auto max-w-2xl text-center">
          <MarketingEyebrow>Support</MarketingEyebrow>
          <MarketingHeading className="mt-token-3">
            We’re here to help
          </MarketingHeading>
          <p className="mt-token-3 text-sm text-muted-foreground sm:text-base">
            Stuck on verification, a payout, or an order? Start here — we route
            you to the right workspace or inbox.
          </p>
        </div>

        <div className="mx-auto mt-10 grid max-w-4xl gap-token-5 sm:grid-cols-2">
          <div className="rounded-lg border border-border bg-card p-token-6 shadow-sm">
            <h2 className="font-display text-lg text-foreground">Sellers</h2>
            <ul className="mt-token-4 space-y-token-3">
              <CheckLine>
                Open Verification and Plan under your seller workspace for
                status and limits.
              </CheckLine>
              <CheckLine>
                Use Products and Orders to update stock and fulfillment.
              </CheckLine>
            </ul>
            <Link href="/seller" className="mt-token-6 inline-block">
              <Button variant="outline">Seller workspace</Button>
            </Link>
          </div>
          <div className="rounded-lg border border-border bg-card p-token-6 shadow-sm">
            <h2 className="font-display text-lg text-foreground">Buyers</h2>
            <ul className="mt-token-4 space-y-token-3">
              <CheckLine>
                My Account → Orders for invoices, tracking, and receipt copies.
              </CheckLine>
              <CheckLine>
                For a specific purchase, also message the shop’s contact page.
              </CheckLine>
            </ul>
            <Link href="/buyer/orders" className="mt-token-6 inline-block">
              <Button variant="outline">Your orders</Button>
            </Link>
          </div>
        </div>

        <div className="mx-auto mt-10 max-w-xl rounded-lg border border-border bg-muted/40 p-token-6 text-center">
          <p className="text-sm text-muted-foreground">
            Still need a human? Email{" "}
            <a className="font-medium text-accent transition hover:text-accent-deep dark:text-accent-on-dark" href={`mailto:${email}`}>
              {email}
            </a>{" "}
            or use the {appName} contact form.
          </p>
          <Link href="/contact" className="mt-token-4 inline-block">
            <Button variant="primary">Contact us</Button>
          </Link>
        </div>
      </MarketingSection>
    </div>
  );
}
