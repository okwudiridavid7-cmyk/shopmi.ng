"use client";

import {
  DotLoader,
  DOT_LOADER_GAME_FRAMES,
} from "@/components/ui/dot-loader";

/** Shared route-level loading UI — centered horizontally & vertically. */
export default function Loading() {
  return (
    <div className="flex min-h-[calc(100dvh-4rem)] w-full flex-col items-center justify-center px-6">
      <div className="flex items-center gap-3 rounded-xl border border-border bg-card px-5 py-4 shadow-sm">
        <DotLoader
          frames={DOT_LOADER_GAME_FRAMES}
          duration={80}
          className="gap-0.5"
          dotClassName="size-1.5 bg-muted-foreground/20 [&.active]:bg-accent"
          aria-hidden
        />
        <p className="text-sm font-medium text-foreground">Loading…</p>
      </div>
    </div>
  );
}
