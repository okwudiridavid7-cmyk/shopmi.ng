"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

const STORAGE_KEY = "seller-plan-banner-dismissed";

type BannerKind = "trial" | "limit" | null;

/**
 * Dismissible trial / product-limit banner.
 * Reappears when still relevant after a new session or when the reason changes.
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
  const nearLimit =
    productLimit != null && productCount >= Math.max(1, productLimit - 2);
  const atLimit = productLimit != null && productCount >= productLimit;

  const kind: BannerKind = atLimit || nearLimit ? "limit" : trialActive ? "trial" : null;
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
            <Link href="/seller/plan" className="text-accent underline">
              view plans
            </Link>
            .
          </p>
        ) : (
          <p className="text-foreground">
            <strong className="font-semibold">
              {atLimit ? "Product limit reached." : "Nearing product limit."}
            </strong>{" "}
            {productCount}/{productLimit} products used —{" "}
            <Link href="/seller/plan" className="text-accent underline">
              upgrade plan
            </Link>
            .
          </p>
        )}
      </div>
      <Button variant="ghost" size="sm" onClick={dismiss} aria-label="Dismiss">
        Dismiss
      </Button>
    </div>
  );
}
