"use client";

import { ReactNode, useEffect, useState } from "react";
import type { TenantPublic } from "@vendors/shared-types";
import { parseHexColor, parseThemeSettings } from "@/lib/theme";

type ShopCard = Pick<TenantPublic, "id" | "name" | "slug" | "verifiedBadge"> & {
  themeSettings?: TenantPublic["themeSettings"];
};

/**
 * Brief shop-to-shop carousel transition (~800ms), then reveal children.
 * Snappy — skips when prefers-reduced-motion.
 */
export function ShopEntryTransition({
  targetSlug,
  peers,
  children,
}: {
  targetSlug: string;
  peers: ShopCard[];
  children: ReactNode;
}) {
  const [phase, setPhase] = useState<"animating" | "done">("animating");
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const reduced =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced || !targetSlug) {
      setPhase("done");
      return;
    }

    setPhase("animating");
    setIndex(0);
    const t1 = window.setTimeout(() => setIndex(1), 220);
    const t2 = window.setTimeout(() => setIndex(2), 440);
    const t3 = window.setTimeout(() => setPhase("done"), 780);
    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
      window.clearTimeout(t3);
    };
  }, [targetSlug]);

  if (phase === "done") {
    return <>{children}</>;
  }

  const deck =
    peers.length > 0
      ? peers
      : [
          {
            id: targetSlug,
            name: targetSlug,
            slug: targetSlug,
            verifiedBadge: false as boolean,
          },
        ];
  const targetIdx = Math.max(
    0,
    deck.findIndex((s) => s.slug === targetSlug)
  );
  const sequence = [
    deck[(targetIdx + deck.length - 2) % deck.length]!,
    deck[(targetIdx + deck.length - 1) % deck.length]!,
    deck[targetIdx]!,
  ];
  const current = sequence[Math.min(index, sequence.length - 1)]!;
  const theme = parseThemeSettings(current.themeSettings);
  const accent =
    parseHexColor(theme.primaryColor) ?? parseHexColor(theme.accentColor);

  return (
    <div
      className="flex min-h-[14rem] items-center justify-center overflow-hidden rounded-lg border border-border bg-muted/30"
      aria-busy
      aria-label="Loading shop"
    >
      <div
        key={`${current.slug}-${index}`}
        className="flex w-full max-w-sm flex-col items-center gap-token-3 px-token-6 py-token-8 transition duration-200"
        style={{
          transform: "translateX(0)",
          opacity: 1,
          borderTop: accent ? `3px solid ${accent}` : undefined,
        }}
      >
        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
          Discovering shops
        </p>
        <p className="font-display text-2xl text-foreground">{current.name}</p>
        <div className="flex gap-token-2">
          {sequence.map((s, i) => (
            <span
              key={`${s.slug}-${i}`}
              className={`h-1.5 w-6 rounded-full transition ${
                i === index ? "bg-accent" : "bg-border"
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
