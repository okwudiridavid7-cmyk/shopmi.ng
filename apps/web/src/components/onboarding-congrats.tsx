"use client";

import Link from "next/link";
import { LayoutDashboard, Package, Store, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  open: boolean;
  shopName?: string;
  shopSlug?: string;
  onClose?: () => void;
  className?: string;
};

/**
 * Post-onboarding congratulations — setup store, dashboard demo, or first product.
 */
export function OnboardingCongrats({
  open,
  shopName,
  shopSlug,
  className,
}: Props) {
  if (!open) return null;

  const sellerHref = "/seller";
  const brandingHref = "/seller/branding";
  const productHref = "/seller/products";

  return (
    <div
      className={cn(
        "fixed inset-0 z-[80] flex items-center justify-center p-4",
        className
      )}
      role="dialog"
      aria-modal="true"
      aria-labelledby="onboarding-congrats-title"
    >
      <div className="absolute inset-0 bg-foreground/40 backdrop-blur-sm" />
      <div className="relative w-full max-w-md overflow-hidden rounded-2xl border border-border bg-card shadow-xl">
        <div className="bg-gradient-to-br from-accent/20 via-card to-card px-6 pb-2 pt-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-accent text-white shadow-lg shadow-accent/30">
            <Sparkles className="h-8 w-8" strokeWidth={2} />
          </div>
          <h2
            id="onboarding-congrats-title"
            className="text-2xl font-bold tracking-tight text-foreground"
          >
            Congratulations!
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            {shopName
              ? `${shopName} is live on Shopmi. What would you like to do next?`
              : "Your shop is live. What would you like to do next?"}
          </p>
        </div>

        <div className="space-y-2 p-6">
          <Link
            href={brandingHref}
            className="flex items-start gap-3 rounded-xl border border-border bg-muted/30 p-4 transition hover:border-accent/40 hover:bg-accent/5"
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-accent/15 text-accent">
              <Store className="h-5 w-5" />
            </span>
            <span className="min-w-0 text-left">
              <span className="block font-semibold text-foreground">
                Set up your store
              </span>
              <span className="mt-0.5 block text-xs text-muted-foreground">
                Logo, colors, and branding polish.
              </span>
            </span>
          </Link>

          <Link
            href={`${sellerHref}?walkthrough=1`}
            className="flex items-start gap-3 rounded-xl border border-border bg-muted/30 p-4 transition hover:border-accent/40 hover:bg-accent/5"
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-accent/15 text-accent">
              <LayoutDashboard className="h-5 w-5" />
            </span>
            <span className="min-w-0 text-left">
              <span className="block font-semibold text-foreground">
                Open your dashboard
              </span>
              <span className="mt-0.5 block text-xs text-muted-foreground">
                Manage orders, products, and shop settings.
              </span>
            </span>
          </Link>

          <Link
            href={productHref}
            className="flex items-start gap-3 rounded-xl border border-border bg-muted/30 p-4 transition hover:border-accent/40 hover:bg-accent/5"
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-accent/15 text-accent">
              <Package className="h-5 w-5" />
            </span>
            <span className="min-w-0 text-left">
              <span className="block font-semibold text-foreground">
                Add your first product
              </span>
              <span className="mt-0.5 block text-xs text-muted-foreground">
                List something and start selling today.
              </span>
            </span>
          </Link>

          <Link
            href={sellerHref}
            className="mt-2 block w-full rounded-lg py-2.5 text-center text-sm font-medium text-muted-foreground transition hover:text-foreground"
          >
            Go to dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
