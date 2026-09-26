"use client";

import {
  DotLoader,
  DOT_LOADER_GAME_FRAMES,
} from "@/components/ui/dot-loader";

/** Demo / story harness for DotLoader. */
export default function DotLoaderDemo() {
  return (
    <div className="flex items-center gap-5 rounded-lg border border-border bg-foreground px-4 py-3 text-background">
      <DotLoader
        frames={DOT_LOADER_GAME_FRAMES}
        className="gap-0.5"
        dotClassName="size-1.5 bg-background/15 [&.active]:bg-background"
      />
      <p className="text-sm font-medium">Playing</p>
    </div>
  );
}
