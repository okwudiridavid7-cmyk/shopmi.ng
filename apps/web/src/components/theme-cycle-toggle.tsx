"use client";

import { Monitor, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

const ORDER = ["light", "dark", "system"] as const;

/**
 * Always-visible light/dark/system cycle.
 * `onBrand` uses a frosted chip so it stays readable on any shop/header color.
 */
export function ThemeCycleToggle({
  onBrand = false,
  className = "",
}: {
  onBrand?: boolean;
  className?: string;
}) {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) {
    return (
      <span
        className={`inline-flex h-9 w-9 rounded-full ${
          onBrand ? "bg-black/20" : "bg-muted"
        } ${className}`}
        aria-hidden
      />
    );
  }

  const current = (ORDER.includes(theme as (typeof ORDER)[number])
    ? theme
    : "system") as (typeof ORDER)[number];
  const next = ORDER[(ORDER.indexOf(current) + 1) % ORDER.length];
  const Icon = current === "dark" ? Moon : current === "light" ? Sun : Monitor;

  return (
    <button
      type="button"
      aria-label={`Appearance: ${current}. Switch to ${next}`}
      title={`Appearance: ${current}`}
      onClick={() => setTheme(next)}
      className={`inline-flex h-9 w-9 items-center justify-center rounded-full border text-sm shadow-sm backdrop-blur-sm transition hover:opacity-90 ${
        onBrand
          ? "border-white/35 bg-black/25 text-white"
          : "border-border bg-card text-foreground"
      } ${className}`}
    >
      <Icon className="h-4 w-4" aria-hidden />
    </button>
  );
}
