"use client";

import type { ReactNode } from "react";
import { AnimatedValue } from "@/components/dashboard/animated-value";
import { BarTrend, fillDays as padDays } from "@/components/dashboard/bar-trend";

export type ChartPoint = {
  date: string;
  value: number;
  label?: string;
};

type Props = {
  title: string;
  description?: string;
  /** Headline figure shown under the title, e.g. the period total. */
  total?: string;
  data: ChartPoint[];
  valueLabel?: string;
  emptyMessage?: string;
  formatValue?: (n: number) => string;
  /** Short axis labels; defaults to compact numbers. */
  formatTick?: (n: number) => string;
  /** Pad a sparse daily series to the last N days. */
  fillDays?: number;
  control?: ReactNode;
  allowDecimals?: boolean;
  className?: string;
};

export function OverviewChart({
  title,
  description,
  total,
  data,
  valueLabel = "Value",
  emptyMessage = "Not enough data yet. Check back after more activity.",
  formatValue = (n) => String(n),
  formatTick,
  fillDays,
  control,
  allowDecimals = true,
  className = "",
}: Props) {
  const hasData = data.some((d) => d.value > 0);
  const series = fillDays ? padDays(data, fillDays) : data;

  return (
    <section className={`dash-card flex flex-col p-5 sm:p-6 ${className}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-base font-semibold text-foreground">{title}</p>
          {total ? (
            <p className="mt-1 text-[1.75rem] font-bold tracking-tight text-foreground">
              <AnimatedValue value={total} />
            </p>
          ) : null}
          {description ? (
            <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
          ) : null}
        </div>
        {control}
      </div>
      <div className="relative mt-4 min-h-[15rem] flex-1">
        {!hasData ? (
          <p className="absolute inset-0 flex items-center justify-center text-center text-sm text-muted-foreground">
            {emptyMessage}
          </p>
        ) : (
          <BarTrend
            data={series}
            valueLabel={valueLabel}
            formatValue={formatValue}
            formatTick={formatTick}
            allowDecimals={allowDecimals}
          />
        )}
      </div>
    </section>
  );
}
