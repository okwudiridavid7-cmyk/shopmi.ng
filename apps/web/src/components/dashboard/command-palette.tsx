"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Command } from "cmdk";
import {
  flattenNavItems,
  navForMode,
  type DashboardMode,
} from "@/lib/dashboard-nav-config";

type Props = {
  mode: DashboardMode;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function CommandPalette({ mode, open, onOpenChange }: Props) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const items = useMemo(() => flattenNavItems(navForMode(mode)), [mode]);

  useEffect(() => {
    if (!open) setQuery("");
  }, [open]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        onOpenChange(true);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onOpenChange]);

  function navigate(href: string) {
    onOpenChange(false);
    router.push(href);
  }

  if (!open) return null;

  return (
    <>
      <button
        type="button"
        className="fixed inset-0 z-50 cursor-default bg-foreground/25 backdrop-blur-[1px] motion-safe:animate-fade-in"
        aria-label="Close command palette"
        onClick={() => onOpenChange(false)}
      />
      <div className="fixed left-4 right-4 top-[15vh] z-50 mx-auto max-w-lg motion-safe:animate-scale-in sm:left-1/2 sm:right-auto sm:w-full sm:max-w-lg sm:-translate-x-1/2">
        <Command
          label="Command palette"
          className="overflow-hidden rounded-lg border border-border bg-card shadow-lg"
          shouldFilter
        >
          <Command.Input
            value={query}
            onValueChange={setQuery}
            placeholder="Search navigation…"
            className="w-full border-b border-border bg-transparent px-token-4 py-token-3 text-sm outline-none placeholder:text-muted-foreground"
          />
          <Command.List className="max-h-[min(50vh,20rem)] overflow-y-auto p-token-2">
            <Command.Empty className="px-token-3 py-token-6 text-center text-sm text-muted-foreground">
              No results found.
            </Command.Empty>
            <Command.Group heading="Navigation">
              {items.map((item) => (
                <Command.Item
                  key={item.id}
                  value={`${item.label} ${item.parentLabel ?? ""} ${item.href}`}
                  onSelect={() => navigate(item.href)}
                  className="flex cursor-pointer flex-col gap-0.5 rounded-md px-token-3 py-token-2 text-sm aria-selected:bg-accent/15 aria-selected:text-accent"
                >
                  <span className="font-medium">{item.label}</span>
                  {item.parentLabel && (
                    <span className="text-xs text-muted-foreground">
                      {item.parentLabel}
                    </span>
                  )}
                </Command.Item>
              ))}
            </Command.Group>
          </Command.List>
        </Command>
      </div>
    </>
  );
}
