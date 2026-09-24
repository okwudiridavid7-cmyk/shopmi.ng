"use client";

import { AlertTriangle } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

type BadgeSize = "sm" | "md";

const sizeClasses: Record<BadgeSize, string> = {
  sm: "h-3.5 w-3.5",
  md: "h-4 w-4",
};

const VERIFIED_TICK_SRC = "/brand/verified-tick.png";

/** Platform verified mark — single source (`/brand/verified-tick.png`). */
export function VerifiedBadge({
  className = "",
  size = "md",
  label = "Verified shop",
}: {
  className?: string;
  size?: BadgeSize;
  label?: string;
}) {
  return (
    <span
      className={`inline-flex shrink-0 ${sizeClasses[size]} ${className}`}
      role="img"
      aria-label={label}
      title={label}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={VERIFIED_TICK_SRC}
        alt=""
        className="h-full w-full object-contain"
        draggable={false}
      />
    </span>
  );
}

export function UnverifiedInlineIcon({
  className = "",
  label = "Unverified shop",
}: {
  className?: string;
  label?: string;
}) {
  return (
    <span
      className={`inline-flex shrink-0 text-warning ${className}`}
      role="img"
      aria-label={label}
      title={label}
    >
      <AlertTriangle className="h-3.5 w-3.5" />
    </span>
  );
}

export function TrustBadge({
  verified,
  className = "",
  size = "md",
  showUnverified = false,
}: {
  verified: boolean;
  className?: string;
  size?: BadgeSize;
  showUnverified?: boolean;
}) {
  if (verified) {
    return <VerifiedBadge className={className} size={size} />;
  }
  if (showUnverified) {
    return <UnverifiedInlineIcon className={className} />;
  }
  return null;
}

export function UnverifiedShopBanner({
  shopName,
  storageKey,
}: {
  shopName?: string;
  storageKey?: string;
}) {
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (!storageKey || typeof window === "undefined") return;
    if (sessionStorage.getItem(storageKey) === "1") {
      setDismissed(true);
    }
  }, [storageKey]);

  if (dismissed) return null;

  function dismiss() {
    setDismissed(true);
    if (storageKey && typeof window !== "undefined") {
      sessionStorage.setItem(storageKey, "1");
    }
  }

  return (
    <div
      role="status"
      className="flex flex-wrap items-start justify-between gap-token-3 rounded-md border border-warning/40 bg-warning-muted px-token-4 py-token-3 text-sm text-warning"
    >
      <p>
        <strong className="font-semibold">Unverified shop.</strong>{" "}
        {shopName ? `${shopName} has` : "This shop has"} not completed platform
        verification. Buy with caution.
      </p>
      <Button
        variant="ghost"
        size="sm"
        onClick={dismiss}
        className="shrink-0 text-warning hover:bg-warning/10"
        aria-label="Dismiss warning"
      >
        Dismiss
      </Button>
    </div>
  );
}
