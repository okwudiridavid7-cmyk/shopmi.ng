"use client";

import { Store } from "lucide-react";

/**
 * Default shop mark when themeSettings.logoUrl is missing.
 * Soft store glyph — not initials-in-a-box.
 */
export function ShopLogoFallback({
  className = "",
  size = "md",
}: {
  className?: string;
  size?: "sm" | "md" | "lg";
}) {
  const box =
    size === "sm"
      ? "h-8 w-8"
      : size === "lg"
        ? "h-12 w-12"
        : "h-10 w-10";
  const icon = size === "sm" ? "h-3.5 w-3.5" : size === "lg" ? "h-5 w-5" : "h-4 w-4";

  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center rounded-md border border-border bg-gradient-to-br from-muted to-card text-muted-foreground shadow-sm ${box} ${className}`}
      aria-hidden
    >
      <Store className={icon} strokeWidth={1.75} />
    </span>
  );
}
