"use client";

import type { ReactNode } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { CalendarDays, Clock, TrendingUp } from "lucide-react";
import { AnimatedValue } from "@/components/dashboard/animated-value";

type Props = {
  firstName: string;
  /** Optional right-side badges (e.g. role). Date/time is always shown. */
  badges?: { icon?: ReactNode; label: string }[];
  subtitle?: string;
  /** Rendered under the hero - typically a grid of AdminHeroMetric cards. */
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
 * Full-width overview hero - filled greeting card + optional metric cards below.
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

  const pill =
    "inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.08] px-3 py-1 text-xs font-medium text-white backdrop-blur-sm transition hover:bg-white/[0.14]";

  return (
    <div className="space-y-4">
      <section className="relative isolate overflow-hidden rounded-[1.5rem] bg-ink px-5 py-6 text-white sm:px-8 sm:py-8">
        <div
          className="pointer-events-none absolute -left-24 -top-32 -z-10 h-72 w-72 rounded-full bg-accent opacity-[0.16] blur-3xl"
          aria-hidden
        />
        <HeroBurst className="pointer-events-none absolute -bottom-8 -right-6 -z-10 h-20 w-20 text-accent animate-burst-in sm:-bottom-10 sm:right-8 sm:h-36 sm:w-36" />

        <div className="flex flex-wrap items-start justify-between gap-3">
          <p
            className="text-xs font-semibold uppercase tracking-[0.16em] text-accent"
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
                className={pill}
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
                className={pill}
              >
                Back to live
              </button>
            ) : null}
            {resolvedBadges.map((b) => (
              <span key={b.label} className={pill}>
                {b.icon}
                {b.label}
              </span>
            ))}
            {trailing}
          </div>
        </div>

        <h1 className="mt-6 max-w-2xl text-[1.75rem] font-bold leading-tight tracking-tight text-white sm:mt-8 sm:text-[2.25rem]">
          {lead}
          <span className="text-accent">{name}</span>
        </h1>
        {subtitle ? (
          <p className="mt-2 max-w-xl pr-12 text-sm text-white/60 sm:pr-0">{subtitle}</p>
        ) : null}
      </section>

      {metrics}
    </div>
  );
}

/** Rounded three-bar asterisk used as the hero's brand shape. */
function HeroBurst({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 100 100" className={className} aria-hidden>
      {[0, 60, 120].map((deg) => (
        <rect
          key={deg}
          x="39"
          y="0"
          width="22"
          height="100"
          rx="11"
          fill="currentColor"
          transform={`rotate(${deg} 50 50)`}
        />
      ))}
    </svg>
  );
}

/** Stat card shown under the hero. `featured` fills it with the brand orange. */
export function AdminHeroMetric({
  label,
  value,
  hint,
  icon,
  featured = false,
  progress,
}: {
  label: string;
  value: string;
  hint?: string;
  icon: ReactNode;
  featured?: boolean;
  /** 0-1, renders a usage bar under the value. */
  progress?: number;
}) {
  const pct = progress == null ? null : Math.max(0, Math.min(1, progress));
  return (
    <div
      className={`dash-card dash-card-hover min-w-0 p-5 ${
        featured ? "!bg-accent text-accent-ink" : ""
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <p
          className={`text-xs font-medium ${
            featured ? "text-[color-mix(in_oklab,var(--color-accent-ink)_70%,transparent)]" : "text-muted-foreground"
          }`}
        >
          {label}
        </p>
        <span
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${
            featured
              ? "bg-ink text-accent"
              : "bg-dash-tint text-accent-strong dark:text-accent-on-dark"
          }`}
        >
          {icon}
        </span>
      </div>
      <p
        className={`mt-3 text-xl font-bold leading-tight tracking-tight [overflow-wrap:anywhere] sm:text-[1.75rem] ${
          featured ? "text-accent-ink" : "text-foreground"
        }`}
      >
        <AnimatedValue value={value} />
      </p>
      {pct != null ? (
        <div
          className={`mt-3 h-1.5 overflow-hidden rounded-full ${
            featured ? "bg-[color-mix(in_oklab,var(--color-accent-ink)_15%,transparent)]" : "bg-chart-track"
          }`}
        >
          <div
            className={`h-full rounded-full animate-bar-grow ${
              featured ? "bg-accent-ink" : pct >= 0.9 ? "bg-danger" : "bg-accent"
            }`}
            style={{ width: `${pct * 100}%` }}
          />
        </div>
      ) : null}
      {hint ? (
        <p
          className={`mt-1.5 text-xs ${
            featured ? "text-[color-mix(in_oklab,var(--color-accent-ink)_70%,transparent)]" : "text-muted-foreground"
          }`}
        >
          {hint}
        </p>
      ) : null}
    </div>
  );
}
