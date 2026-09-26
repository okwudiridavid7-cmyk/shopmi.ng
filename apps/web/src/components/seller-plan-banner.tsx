"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { TextLink } from "@/components/ui/text-link";
import { usePlatformBranding } from "@/hooks/use-branding";

const STORAGE_KEY = "seller-plan-banner-dismissed";

type BannerKind = "trial" | "limit" | null;

/**
 * Dismissible trial / product-limit banner.
 * Hidden entirely when platform billing is off.
 */
export function SellerPlanBanner({
  trialActive,
  trialDaysLeft,
  productCount,
  productLimit,
}: {
  trialActive: boolean;
  trialDaysLeft: number;
  productCount: number;
  productLimit: number | null;
}) {
  const billingEnabled =
    usePlatformBranding().data?.billingEnabled !== false;

  const nearLimit =
    productLimit != null && productCount >= Math.max(1, productLimit - 2);
  const atLimit = productLimit != null && productCount >= productLimit;

  const kind: BannerKind =
    atLimit || nearLimit ? "limit" : trialActive ? "trial" : null;
  const reasonKey = kind
    ? kind === "trial"
      ? `trial:${trialDaysLeft}`
      : `limit:${productCount}/${productLimit}`
    : null;

  const [dismissedKey, setDismissedKey] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    setDismissedKey(sessionStorage.getItem(STORAGE_KEY));
  }, []);

  if (!billingEnabled) return null;
  if (!kind || !reasonKey) return null;
  if (dismissedKey === reasonKey) return null;

  function dismiss() {
    if (!reasonKey) return;
    sessionStorage.setItem(STORAGE_KEY, reasonKey);
    setDismissedKey(reasonKey);
  }

  return (
    <div
      role="status"
      className="flex flex-wrap items-start justify-between gap-token-3 rounded-md border border-accent/30 bg-accent/10 px-token-4 py-token-3 text-sm"
    >
      <div className="space-y-token-1">
        {kind === "trial" ? (
          <p className="text-foreground">
            <strong className="font-semibold">Trial active.</strong>{" "}
            {trialDaysLeft} day{trialDaysLeft === 1 ? "" : "s"} left —{" "}
            <TextLink href="/seller/plan">view plans</TextLink>.
          </p>
        ) : (
          <p className="text-foreground">
            <strong className="font-semibold">
              {atLimit ? "Product limit reached." : "Nearing product limit."}
            </strong>{" "}
            {productCount}/{productLimit} products used —{" "}
            <TextLink href="/seller/plan">upgrade plan</TextLink>.
          </p>
        )}
      </div>
      <Button variant="ghost" size="sm" onClick={dismiss} aria-label="Dismiss">
        Dismiss
      </Button>
    </div>
  );
}
