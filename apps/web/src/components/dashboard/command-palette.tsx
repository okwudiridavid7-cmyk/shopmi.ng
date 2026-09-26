"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Command } from "cmdk";
import {
  ArrowRight,
  Cloud,
  CornerDownLeft,
  HelpCircle,
  LifeBuoy,
  Search,
  Sparkles,
} from "lucide-react";
import {
  flattenNavItems,
  navGroupsForMode,
  type DashboardMode,
  type NavItem,
} from "@/lib/dashboard-nav-config";

type Props = {
  mode: DashboardMode;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

const RECENTS_KEY = "shopmi.cmd.recents";

type RecentEntry = { href: string; label: string; at: number };

function loadRecents(): RecentEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(RECENTS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as RecentEntry[];
    return Array.isArray(parsed) ? parsed.slice(0, 6) : [];
  } catch {
    return [];
  }
}

function pushRecent(entry: Omit<RecentEntry, "at">) {
  try {
    const prev = loadRecents().filter((r) => r.href !== entry.href);
    const next = [{ ...entry, at: Date.now() }, ...prev].slice(0, 6);
    window.localStorage.setItem(RECENTS_KEY, JSON.stringify(next));
  } catch {
    /* ignore */
  }
}

const TIPS = [
  {
    id: "tip-go",
    label: "go:",
    description: "Jump to a section by name",
    icon: Sparkles,
  },
  {
    id: "tip-help",
    label: "help:",
    description: "Open FAQs and support",
    icon: HelpCircle,
  },
  {
    id: "tip-shop",
    label: "shop:",
    description: "Browse the marketplace",
    icon: Cloud,
  },
] as const;

/**
 * Robust ⌘K palette — categories, icons, keyboard hints, promo footer.
 */
export function CommandPalette({ mode, open, onOpenChange }: Props) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [recents, setRecents] = useState<RecentEntry[]>([]);
  const groups = useMemo(() => navGroupsForMode(mode), [mode]);
  const flat = useMemo(() => flattenNavItems(groups.flatMap((g) => g.items)), [groups]);

  useEffect(() => {
    if (!open) setQuery("");
    else setRecents(loadRecents());
  }, [open]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        onOpenChange(true);
      }
      if (e.key === "Escape" && open) onOpenChange(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onOpenChange, open]);

  function navigate(href: string, label: string) {
    pushRecent({ href, label });
    onOpenChange(false);
    router.push(href);
  }

  const recentItems = useMemo(() => {
    return recents
      .map((r) => {
        const match = flat.find((f) => f.href === r.href);
        return match
          ? { ...match, label: r.label || match.label }
          : null;
      })
      .filter(Boolean) as ReturnType<typeof flattenNavItems>;
  }, [recents, flat]);

  if (!open) return null;

  return (
    <>
      <button
        type="button"
        className="fixed inset-0 z-50 cursor-default bg-foreground/30 backdrop-blur-[2px] motion-safe:animate-fade-in"
        aria-label="Close command palette"
        onClick={() => onOpenChange(false)}
      />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="w-full max-w-xl motion-safe:animate-scale-in">
        <Command
          label="Command palette"
          className="overflow-hidden rounded-2xl border border-border bg-card shadow-lg"
          shouldFilter
        >
          <div className="border-b border-border p-3">
            <div className="relative flex items-center">
              <Search
                className="pointer-events-none absolute left-3 h-4 w-4 text-muted-foreground"
                aria-hidden
              />
              <Command.Input
                value={query}
                onValueChange={setQuery}
                placeholder="Search"
                className="w-full rounded-xl border border-border bg-muted/40 py-2.5 pl-10 pr-20 text-sm outline-none placeholder:text-muted-foreground focus:border-ring focus:ring-2 focus:ring-ring/30"
              />
              <kbd className="pointer-events-none absolute right-2.5 inline-flex items-center gap-1">
                <span className="inline-flex h-6 min-w-[1.35rem] items-center justify-center rounded-md border border-border bg-card px-1.5 font-sans text-[11px] font-semibold text-muted-foreground shadow-sm">
                  ⌘
                </span>
                <span className="inline-flex h-6 min-w-[1.35rem] items-center justify-center rounded-md border border-border bg-card px-1.5 font-sans text-[11px] font-semibold text-muted-foreground shadow-sm">
                  K
                </span>
              </kbd>
            </div>
          </div>

          <Command.List className="max-h-[min(52vh,22rem)] overflow-y-auto overscroll-contain px-2 py-2">
            <Command.Empty className="px-3 py-8 text-center text-sm text-muted-foreground">
              No results found.
            </Command.Empty>

            {recentItems.length > 0 && !query.trim() ? (
              <Command.Group
                heading="Recents"
                className="[&_[cmdk-group-heading]]:px-2.5 [&_[cmdk-group-heading]]:py-2 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-bold [&_[cmdk-group-heading]]:normal-case [&_[cmdk-group-heading]]:tracking-normal [&_[cmdk-group-heading]]:text-foreground"
              >
                {recentItems.map((item) => (
                  <PaletteItem
                    key={`recent-${item.id}`}
                    item={item}
                    onSelect={() => navigate(item.href, item.label)}
                  />
                ))}
              </Command.Group>
            ) : null}

            {groups.map((group) => (
              <Command.Group
                key={group.id}
                heading={group.label}
                className="[&_[cmdk-group-heading]]:px-2.5 [&_[cmdk-group-heading]]:py-2 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-bold [&_[cmdk-group-heading]]:normal-case [&_[cmdk-group-heading]]:tracking-normal [&_[cmdk-group-heading]]:text-foreground"
              >
                {flattenNavItems(group.items).map((item) => (
                  <PaletteItem
                    key={item.id}
                    item={item}
                    onSelect={() => navigate(item.href, item.label)}
                  />
                ))}
              </Command.Group>
            ))}

            <Command.Group
              heading="Search tips"
              className="[&_[cmdk-group-heading]]:px-2.5 [&_[cmdk-group-heading]]:py-2 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-bold [&_[cmdk-group-heading]]:normal-case [&_[cmdk-group-heading]]:tracking-normal [&_[cmdk-group-heading]]:text-foreground"
            >
              {TIPS.map((tip) => {
                const Icon = tip.icon;
                return (
                  <Command.Item
                    key={tip.id}
                    value={`${tip.label} ${tip.description}`}
                    onSelect={() => {
                      if (tip.id === "tip-help") navigate("/faq", "FAQs");
                      else if (tip.id === "tip-shop") navigate("/", "Marketplace");
                      else setQuery("");
                    }}
                    className="group flex cursor-pointer items-center gap-3 rounded-xl px-2.5 py-2.5 text-sm aria-selected:bg-muted"
                  >
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-border bg-background text-muted-foreground">
                      <Icon className="h-4 w-4" aria-hidden />
                    </span>
                    <span className="min-w-0 flex-1 truncate">
                      <span className="font-semibold text-foreground">
                        {tip.label}
                      </span>
                      <span className="text-muted-foreground">
                        {" "}
                        — {tip.description}
                      </span>
                    </span>
                    <ArrowRight
                      className="h-4 w-4 shrink-0 text-muted-foreground opacity-0 transition group-aria-selected:opacity-100"
                      aria-hidden
                    />
                  </Command.Item>
                );
              })}
            </Command.Group>
          </Command.List>

          <div className="flex items-center gap-4 border-t border-border px-4 py-2.5 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <kbd className="rounded border border-border bg-muted px-1.5 py-0.5 font-sans text-[10px]">
                ↑
              </kbd>
              <kbd className="rounded border border-border bg-muted px-1.5 py-0.5 font-sans text-[10px]">
                ↓
              </kbd>
              to navigate
            </span>
            <span className="inline-flex items-center gap-1.5">
              <kbd className="inline-flex items-center gap-0.5 rounded border border-border bg-muted px-1.5 py-0.5 font-sans text-[10px]">
                <CornerDownLeft className="h-3 w-3" aria-hidden />
              </kbd>
              to select
            </span>
          </div>
        </Command>

        <div className="mt-2 flex items-center gap-3 rounded-2xl border border-border bg-card px-4 py-3 shadow-md">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-accent/15 text-accent dark:text-accent-on-dark">
            <LifeBuoy className="h-4 w-4" aria-hidden />
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-foreground">
              Need a hand with Shopmi.ng?
            </p>
            <p className="truncate text-xs text-muted-foreground">
              FAQs, support hub, and contact — we&apos;re here.
            </p>
          </div>
          <Link
            href="/support"
            onClick={() => onOpenChange(false)}
            className="shrink-0 rounded-lg bg-accent px-3.5 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-accent-deep"
          >
            Learn more
          </Link>
        </div>
        </div>
      </div>
    </>
  );
}

function PaletteItem({
  item,
  onSelect,
}: {
  item: {
    id: string;
    href: string;
    label: string;
    parentLabel?: string;
    icon?: NavItem["icon"];
    keywords?: string[];
  };
  onSelect: () => void;
}) {
  const Icon = item.icon;
  const secondary = item.parentLabel ?? item.keywords?.[0] ?? item.href;
  return (
    <Command.Item
      value={`${item.label} ${item.parentLabel ?? ""} ${item.href} ${(item.keywords ?? []).join(" ")}`}
      onSelect={onSelect}
      className="group flex cursor-pointer items-center gap-3 rounded-xl px-2.5 py-2.5 text-sm aria-selected:bg-muted"
    >
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-border bg-background text-muted-foreground">
        {Icon ? <Icon className="h-4 w-4" aria-hidden /> : null}
      </span>
      <span className="min-w-0 flex-1 truncate">
        <span className="font-medium text-foreground">{item.label}</span>
        <span className="text-muted-foreground"> — {secondary}</span>
      </span>
      <ArrowRight
        className="h-4 w-4 shrink-0 text-muted-foreground opacity-0 transition group-aria-selected:opacity-100"
        aria-hidden
      />
    </Command.Item>
  );
}
