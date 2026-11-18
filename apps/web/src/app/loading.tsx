"use client";

import Spark from "@/components/ui/spark";

/** Shared route-level loading UI - centered horizontally & vertically. */
export default function Loading() {
  return (
    <div className="flex min-h-dvh w-full flex-col items-center justify-center px-6">
      <div className="flex items-center gap-3 rounded-xl border border-border bg-card px-5 py-4 shadow-sm">
        <Spark size={26} color="var(--color-accent-strong)" />
        <p className="text-sm font-medium text-foreground">Loading…</p>
      </div>
    </div>
  );
}
