"use client";

import { useEffect, useMemo, useState } from "react";
import { Card, CardBody } from "@/components/ui/card";

type InlineStat = {
  label: string;
  value: string;
};

type Props = {
  firstName: string;
  stats: InlineStat[];
};

function timeOfDay(hour: number): "morning" | "afternoon" | "evening" {
  if (hour < 12) return "morning";
  if (hour < 17) return "afternoon";
  return "evening";
}

function greetingFor(now: Date, firstName: string): string {
  const tod = timeOfDay(now.getHours());
  const day = Math.floor(now.getTime() / 86_400_000);
  // ~1 in 5 days get a gentle variant instead of the standard greeting
  const variant = day % 5 === 0;

  if (variant) {
    if (tod === "morning") return `Beautiful day, ${firstName}`;
    if (tod === "afternoon") return `Hope you're having a good one, ${firstName}`;
    return `Winding down nicely, ${firstName}`;
  }

  if (tod === "morning") return `Good morning, ${firstName}`;
  if (tod === "afternoon") return `Good afternoon, ${firstName}`;
  return `Good evening, ${firstName}`;
}

function formatClock(now: Date): { date: string; time: string } {
  const date = now.toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
  const time = now.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
  return { date, time };
}

/** Overview greeting — live clock (1min), time-of-day greeting, inline core stats. */
export function GreetingCard({ firstName, stats }: Props) {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const tick = () => setNow(new Date());
    tick();
    const id = window.setInterval(tick, 60_000);
    return () => window.clearInterval(id);
  }, []);

  const greeting = useMemo(() => greetingFor(now, firstName), [now, firstName]);
  const { date, time } = useMemo(() => formatClock(now), [now]);

  return (
    <Card className="overflow-hidden border-border/80 shadow-sm">
      <div className="relative">
        <div
          className="pointer-events-none absolute inset-0 bg-gradient-to-br from-accent/10 via-transparent to-muted/40"
          aria-hidden
        />
        <CardBody className="relative space-y-token-6 p-token-6 sm:p-token-8">
          <div className="flex flex-wrap items-start justify-between gap-token-4">
            <div className="min-w-0 space-y-token-2">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent">
                Overview
              </p>
              <h1 className="font-display text-3xl tracking-tight text-foreground sm:text-4xl">
                {greeting}
              </h1>
              <p className="text-sm text-muted-foreground">
                <span suppressHydrationWarning>{date}</span>
                <span className="mx-2 text-border">·</span>
                <span suppressHydrationWarning>{time}</span>
              </p>
            </div>
          </div>

          {stats.length > 0 && (
            <div className="grid grid-cols-2 gap-token-4 border-t border-border/60 pt-token-5 sm:grid-cols-4">
              {stats.map((s) => (
                <div key={s.label} className="min-w-0">
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    {s.label}
                  </p>
                  <p className="mt-token-1 truncate font-display text-xl text-foreground sm:text-2xl">
                    {s.value}
                  </p>
                </div>
              ))}
            </div>
          )}
        </CardBody>
      </div>
    </Card>
  );
}
