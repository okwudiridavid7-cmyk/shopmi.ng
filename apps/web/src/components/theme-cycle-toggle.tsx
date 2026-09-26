"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

/**
 * Light / Dark toggle. Persisted via next-themes (`vendors-theme`).
 * Default is light (see ThemeProvider).
 */
export function ThemeCycleToggle({
  onBrand = false,
  className = "",
}: {
  onBrand?: boolean;
  className?: string;
}) {
  const { resolvedTheme, setTheme } = useTheme();
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

  const isDark = resolvedTheme === "dark";
  const next = isDark ? "light" : "dark";
  const Icon = isDark ? Moon : Sun;

  return (
    <button
      type="button"
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      title={isDark ? "Dark mode" : "Light mode"}
      onClick={() => setTheme(next)}
      className={`inline-flex h-9 w-9 items-center justify-center rounded-full border text-sm shadow-sm backdrop-blur-sm transition hover:opacity-90 ${
        onBrand
          ? "border-white/35 bg-black/25 text-white"
          : "border-border bg-card text-muted-foreground hover:text-foreground"
      } ${className}`}
    >
      <Icon className="h-4 w-4" aria-hidden />
    </button>
  );
}
