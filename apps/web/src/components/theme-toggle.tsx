"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import type { DropdownItem } from "@/components/ui/dropdown";

const OPTIONS = [
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
] as const;

/** Theme choices for the account dropdown menu. */
export function themeDropdownItems(setTheme: (v: string) => void): DropdownItem[] {
  return [
    { id: "theme-heading", label: "Appearance", disabled: true },
    ...OPTIONS.map((opt) => ({
      id: `theme-${opt.value}`,
      label: opt.label,
      onSelect: () => setTheme(opt.value),
    })),
  ];
}

/** @deprecated Navbar toggle removed in Wave 3 — use account dropdown instead. */
export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  if (!mounted) {
    return (
      <div
        className="h-9 w-[11.5rem] rounded-md border border-border bg-card shadow-sm"
        aria-hidden
      />
    );
  }

  return (
    <div
      role="group"
      aria-label="Color theme"
      className="inline-flex rounded-md border border-border bg-card p-token-1 shadow-sm"
    >
      {OPTIONS.map((opt) => {
        const active = theme === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => setTheme(opt.value)}
            className={`rounded-sm px-token-2 py-token-1 text-xs font-medium transition-colors motion-safe:active:scale-95 ${
              active
                ? "bg-accent text-accent-foreground shadow-sm"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            }`}
            aria-pressed={active}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

export function useThemeMenuItems(): DropdownItem[] {
  const { setTheme } = useTheme();
  return themeDropdownItems(setTheme);
}
