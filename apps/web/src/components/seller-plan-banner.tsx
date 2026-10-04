"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { TextLink } from "@/components/ui/text-link";
import { usePlatformBranding } from "@/hooks/use-branding";
import { cn } from "@/lib/utils";

const STORAGE_KEY = "seller-plan-banner-dismissed";

/** Show the paid-plan renewal notice this many days before it ends. */
const RENEWAL_NOTICE_DAYS = 5;

type BannerKind = "lapsed" | "paused" | "ending" | "limit" | "trial" | null;

/**
 * Dismissible plan banner: lapsed storefront, paused products, renewal,
 * product limit, trial. Hidden entirely when platform billing is off.
 */
export function SellerPlanBanner({
  trialActive,
  daysLeft,
  planName,
  paidUntil,
  lapsed,
  liveCount,
  pausedCount,
  productLimit,
}: {
  trialActive: boolean;
  daysLeft: number;
  planName: string | null;
  paidUntil: string | null;
  lapsed: boolean;
  liveCount: number;
  pausedCount: number;
  productLimit: number | null;
}) {
  const billingEnabled =
    usePlatformBranding().data?.billingEnabled !== false;

  const nearLimit =
    productLimit != null && liveCount >= Math.max(1, productLimit - 2);
  const atLimit = productLimit != null && liveCount >= productLimit;
  const ending = !!paidUntil && daysLeft > 0 && daysLeft <= RENEWAL_NOTICE_DAYS;

  const kind: BannerKind = lapsed
    ? "lapsed"
    : pausedCount > 0
      ? "paused"
      : ending
        ? "ending"
        : atLimit || nearLimit
          ? "limit"
          : trialActive
            ? "trial"
            : null;
  const reasonKey =
    kind === "lapsed"
      ? null
      : kind === "paused"
        ? `paused:${pausedCount}`
        : kind === "ending"
          ? `ending:${paidUntil}:${daysLeft}`
          : kind === "limit"
            ? `limit:${liveCount}/${productLimit}`
            : kind === "trial"
              ? `trial:${daysLeft}`
              : null;

  const [dismissedKey, setDismissedKey] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    setDismissedKey(sessionStorage.getItem(STORAGE_KEY));
  }, []);

  if (!billingEnabled || !kind) return null;
  if (reasonKey && dismissedKey === reasonKey) return null;

  function dismiss() {
    if (!reasonKey) return;
    sessionStorage.setItem(STORAGE_KEY, reasonKey);
    setDismissedKey(reasonKey);
  }

  const days = `${daysLeft} day${daysLeft === 1 ? "" : "s"}`;

  return (
    <div
      role="status"
      className={cn(
        "flex flex-wrap items-start justify-between gap-token-3 rounded-md border px-token-4 py-token-3 text-sm",
        kind === "lapsed"
          ? "border-danger bg-[color-mix(in_oklab,var(--color-danger)_8%,transparent)]"
          : "border-accent bg-[color-mix(in_oklab,var(--color-accent)_10%,transparent)]"
      )}
    >
      <div className="space-y-token-1">
        {kind === "lapsed" ? (
          <p className="text-foreground">
            <strong className="font-semibold">Your storefront is unavailable.</strong> Your plan
            has ended, so shoppers can’t see your shop. You can still fulfil existing orders.{" "}
            <TextLink href="/seller/plan">Renew</TextLink>.
          </p>
        ) : kind === "paused" ? (
          <p className="text-foreground">
            <strong className="font-semibold">
              {pausedCount} product{pausedCount === 1 ? " is" : "s are"} paused.
            </strong>{" "}
            {planName ?? "Your plan"} allows {productLimit} live products, so the
            rest are hidden from shoppers. Nothing was deleted.{" "}
            <TextLink href="/seller/products">Review products</TextLink>.
          </p>
        ) : kind === "ending" ? (
          <p className="text-foreground">
            <strong className="font-semibold">
              {planName ?? "Your plan"} ends in {days}.
            </strong>{" "}
            Renew to keep your current limits and features.{" "}
            <TextLink href="/seller/plan">Renew plan</TextLink>.
          </p>
        ) : kind === "trial" ? (
          <p className="text-foreground">
            <strong className="font-semibold">Trial active.</strong> {days} left on{" "}
            {planName ?? "your plan"}.{" "}
            <TextLink href="/seller/plan">What happens next</TextLink>.
          </p>
        ) : (
          <p className="text-foreground">
            <strong className="font-semibold">
              {atLimit ? "Product limit reached." : "Nearing product limit."}
            </strong>{" "}
            {liveCount}/{productLimit} live products.{" "}
            <TextLink href="/seller/plan">See plans</TextLink>.
          </p>
        )}
      </div>
      {reasonKey ? (
        <Button variant="ghost" size="sm" onClick={dismiss} aria-label="Dismiss">
          Dismiss
        </Button>
      ) : null}
    </div>
  );
}
