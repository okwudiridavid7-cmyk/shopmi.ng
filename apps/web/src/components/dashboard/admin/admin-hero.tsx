"use client";

import type { ReactNode } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { CalendarDays, Clock, TrendingUp } from "lucide-react";

type Props = {
  firstName: string;
  /** Optional right-side badges (e.g. role). Date/time is always shown. */
  badges?: { icon?: ReactNode; label: string }[];
  subtitle?: string;
  /** Bottom metric strip — typically AdminMetricCard or strip cells. */
  metrics?: ReactNode;
  /** Trailing control next to badges (e.g. period toggle). */
  trailing?: ReactNode;
  /** Selected calendar day (YYYY-MM-DD). Omit / null = live “now”. */
  selectedDay?: string | null;
  onSelectedDayChange?: (day: string | null) => void;
  /** Hide the default Administrator role badge when custom badges provided. */
  roleBadge?: string;
};

function timeOfDay(hour: number): "morning" | "afternoon" | "evening" {
  if (hour < 12) return "morning";
  if (hour < 17) return "afternoon";
  return "evening";
}

function greetingParts(
  now: Date,
  firstName: string
): { lead: string; name: string } {
  const tod = timeOfDay(now.getHours());
  const day = now.getDay();
  const variant = Math.floor(now.getTime() / 86_400_000) % 5 === 0;

  if (day === 5) return { lead: "Almost the weekend, ", name: firstName };
  if (day === 0 || day === 6)
    return { lead: "Enjoy the weekend, ", name: firstName };

  if (variant) {
    if (tod === "morning") return { lead: "Beautiful day, ", name: firstName };
    if (tod === "afternoon")
      return { lead: "Hope you're having a good one, ", name: firstName };
    return { lead: "Winding down nicely, ", name: firstName };
  }

  if (tod === "morning") return { lead: "Good morning, ", name: firstName };
  if (tod === "afternoon") return { lead: "Good afternoon, ", name: firstName };
  return { lead: "Good evening, ", name: firstName };
}

function formatDateLine(now: Date): string {
  return now
    .toLocaleDateString(undefined, {
      weekday: "long",
      day: "numeric",
      month: "long",
    })
    .toUpperCase();
}

function formatDateTimeBadge(now: Date): string {
  return now.toLocaleString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function dayLabel(day: string): string {
  const d = new Date(`${day}T12:00:00`);
  return d.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

/**
 * Full-width overview hero — greeting band + optional metric strip.
 * Date/time badge is clickable to pick a historical day for stats.
 */
export function AdminHero({
  firstName,
  badges,
  subtitle = "Here's what's happening across your marketplace today.",
  metrics,
  trailing,
  selectedDay = null,
  onSelectedDayChange,
  roleBadge = "Administrator",
}: Props) {
  const [now, setNow] = useState(() => new Date());
  const dateInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const tick = () => setNow(new Date());
    tick();
    const id = window.setInterval(tick, 30_000);
    return () => window.clearInterval(id);
  }, []);

  const { lead, name } = useMemo(
    () => greetingParts(now, firstName),
    [now, firstName]
  );
  const dateLine = useMemo(() => formatDateLine(now), [now]);
  const timeBadge = useMemo(() => formatDateTimeBadge(now), [now]);

  const todayIso = useMemo(() => {
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, "0");
    const d = String(now.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }, [now]);

  const resolvedBadges =
    badges ??
    ([
      {
        icon: <TrendingUp className="h-3.5 w-3.5" aria-hidden />,
        label: roleBadge,
      },
    ] as const);

  function openDayPicker() {
    const el = dateInputRef.current;
    if (!el) return;
    try {
      el.showPicker?.();
    } catch {
      el.click();
    }
  }

  return (
    <section className="w-full overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
      <div className="bg-gradient-to-b from-accent-soft/80 via-accent-soft/25 to-card px-5 pb-6 pt-5 sm:px-6 sm:pt-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <p
            className="text-xs font-semibold uppercase tracking-[0.14em] text-accent dark:text-accent-on-dark"
            suppressHydrationWarning
          >
            {selectedDay ? `VIEWING · ${dayLabel(selectedDay).toUpperCase()}` : dateLine}
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <button
                type="button"
                onClick={openDayPicker}
                title="Pick a day to view stats"
                className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-foreground shadow-sm transition hover:bg-muted"
              >
                {selectedDay ? (
                  <CalendarDays className="h-3.5 w-3.5" aria-hidden />
                ) : (
                  <Clock className="h-3.5 w-3.5" aria-hidden />
                )}
                <span suppressHydrationWarning>
                  {selectedDay ? dayLabel(selectedDay) : timeBadge}
                </span>
              </button>
              <input
                ref={dateInputRef}
                type="date"
                max={todayIso}
                value={selectedDay ?? todayIso}
                onChange={(e) => {
                  const v = e.target.value;
                  if (!v || v === todayIso) onSelectedDayChange?.(null);
                  else onSelectedDayChange?.(v);
                }}
                className="pointer-events-none absolute inset-0 h-full w-full opacity-0"
                aria-label="Select day for stats"
                tabIndex={-1}
              />
            </div>
            {selectedDay ? (
              <button
                type="button"
                onClick={() => onSelectedDayChange?.(null)}
                className="rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-muted-foreground shadow-sm hover:text-foreground"
              >
                Back to live
              </button>
            ) : null}
            {resolvedBadges.map((b) => (
              <span
                key={b.label}
                className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-foreground shadow-sm"
              >
                {b.icon}
                {b.label}
              </span>
            ))}
            {trailing}
          </div>
        </div>

        <h1 className="mt-5 text-[1.75rem] font-bold leading-tight tracking-tight text-foreground sm:text-[2rem]">
          {lead}
          <span className="text-accent dark:text-accent-on-dark">{name}</span>
        </h1>
        {subtitle ? (
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            {subtitle}
          </p>
        ) : null}
      </div>

      {metrics ? (
        <div className="border-t border-border bg-card">{metrics}</div>
      ) : null}
    </section>
  );
}

/** Compact metric cell for the hero strip (divider layout). */
export function AdminHeroMetric({
  label,
  value,
  hint,
  icon,
  chipClass,
}: {
  label: string;
  value: string;
  hint?: string;
  icon: ReactNode;
  chipClass: string;
}) {
  return (
    <div className="min-w-0 px-5 py-5 sm:px-6">
      <div className="flex items-start justify-between gap-3">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          {label}
        </p>
        <span
          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${chipClass}`}
        >
          {icon}
        </span>
      </div>
      <p className="mt-3 text-2xl font-bold tracking-tight text-foreground sm:text-[1.75rem]">
        {value}
      </p>
      {hint ? (
        <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
      ) : null}
    </div>
  );
}
