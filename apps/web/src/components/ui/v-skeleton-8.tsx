//biome-ignore-all lint/suspicious/noArrayIndexKey: <>

import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/v-skeleton-8-utils/skeleton";

type PatternProps = {
  /** Fill the viewport like the real dashboard shell (dark sidebar from lg, canvas background). */
  fill?: boolean;
  className?: string;
  /** Announced to screen readers while the skeleton is visible. */
  label?: string;
};

/** Page header, stat cards and list rows: the content area of a dashboard page. */
export function PatternMain({ className }: { className?: string }) {
  return (
    <div className={cn("flex flex-1 flex-col", className)} aria-hidden>
      <div className="flex items-center justify-between border-b border-border px-5 py-3">
        <Skeleton className="h-5 w-32" />
        <div className="flex items-center gap-2">
          <Skeleton className="h-7 w-20 rounded-md" />
          <Skeleton className="h-7 w-7 rounded-md" />
        </div>
      </div>

      <div className="flex-1 space-y-4 p-5">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div className="space-y-2 rounded-lg border border-border p-3" key={i}>
              <Skeleton className="h-3 w-16" />
              <Skeleton className="h-6 w-20" />
              <Skeleton className="h-3 w-24" />
            </div>
          ))}
        </div>

        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              className="flex items-center gap-3 rounded-lg border border-border px-3 py-2.5"
              key={i}
            >
              <Skeleton className="size-8 shrink-0 rounded-md" />
              <div className="min-w-0 flex-1 space-y-1.5">
                <Skeleton className="h-3.5 w-40 max-w-full" />
                <Skeleton className="h-3 w-28 max-w-full" />
              </div>
              <Skeleton className="h-5 w-14 shrink-0 rounded-full" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/** In-shell loading state: the content skeleton on a card, for use inside an already rendered dashboard. */
export function DashboardContentSkeleton({ label = "Loading" }: { label?: string }) {
  return (
    <div role="status" aria-live="polite" className="overflow-hidden rounded-xl border border-border bg-card">
      <span className="sr-only">{label}</span>
      <PatternMain />
    </div>
  );
}

export function Pattern({ fill = false, className, label = "Loading" }: PatternProps) {
  const block = fill ? "bg-white/10" : undefined;

  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        "flex overflow-hidden",
        fill
          ? "h-full w-full flex-1"
          : "h-80 w-full max-w-2xl rounded-xl border border-border bg-card",
        className
      )}
    >
      <span className="sr-only">{label}</span>

      <div
        aria-hidden
        className={cn(
          "shrink-0 flex-col gap-1 border-r p-3",
          fill
            ? "hidden w-[16.5rem] border-ink-border bg-ink lg:flex"
            : "flex w-48 border-border bg-card"
        )}
      >
        <div className="mb-2 flex items-center gap-2 px-1 py-1">
          <Skeleton className={cn("size-6 rounded-md", block)} />
          <Skeleton className={cn("h-4 w-20", block)} />
        </div>

        {[60, 44, 52, 36].map((w, i) => (
          <div className="flex items-center gap-2 rounded-md px-2 py-1.5" key={i}>
            <Skeleton className={cn("size-4 rounded-sm", block)} />
            <Skeleton className={cn("h-3.5", block)} style={{ width: `${w}%` }} />
          </div>
        ))}

        <div className={cn("mt-3 border-t pt-3", fill ? "border-ink-border" : "border-border")}>
          {[48, 56].map((w, i) => (
            <div className="flex items-center gap-2 rounded-md px-2 py-1.5" key={i}>
              <Skeleton className={cn("size-4 rounded-sm", block)} />
              <Skeleton className={cn("h-3.5", block)} style={{ width: `${w}%` }} />
            </div>
          ))}
        </div>

        <div className="mt-auto flex items-center gap-2 px-2 py-1.5">
          <Skeleton className={cn("size-7 rounded-full", block)} />
          <div className="space-y-1">
            <Skeleton className={cn("h-3 w-20", block)} />
            <Skeleton className={cn("h-2.5 w-16", block)} />
          </div>
        </div>
      </div>

      {fill ? (
        <div className="flex min-w-0 flex-1 flex-col overflow-hidden" aria-hidden>
          <div className="flex shrink-0 items-center gap-3 border-b border-border bg-card px-4 py-3 lg:hidden">
            <Skeleton className="size-9 rounded-md" />
            <Skeleton className="h-4 w-16" />
          </div>
          <div className="flex-1 overflow-hidden bg-dash-canvas px-token-4 py-token-6 sm:px-token-6 lg:px-token-8 lg:py-token-8">
            <div className="mx-auto w-full max-w-5xl overflow-hidden rounded-xl border border-border bg-card">
              <PatternMain />
            </div>
          </div>
        </div>
      ) : (
        <PatternMain className="min-w-0" />
      )}
    </div>
  );
}

export default Pattern;
