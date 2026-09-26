"use client";

import type { ReactNode } from "react";
import {
  Area,
  AreaChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export type ChartPoint = {
  date: string;
  value: number;
};

type Props = {
  title: string;
  totalLabel: string;
  comparisonText?: string;
  data: ChartPoint[];
  valueLabel?: string;
  emptyMessage?: string;
  periodControl?: ReactNode;
};

export function AdminInsightsChart({
  title,
  totalLabel,
  comparisonText,
  data,
  valueLabel = "Signups",
  emptyMessage = "Not enough data yet — new shop signups will appear here.",
  periodControl,
}: Props) {
  const hasData = data.some((d) => d.value > 0);

  return (
    <section className="rounded-xl border border-border bg-card shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border px-5 py-4">
        <div className="min-w-0">
          <p className="text-sm font-medium text-foreground">{title}</p>
          <p className="mt-1 text-2xl font-bold tracking-tight text-foreground">
            {totalLabel}
          </p>
          {comparisonText ? (
            <p className="mt-0.5 text-xs text-muted-foreground">
              {comparisonText}
            </p>
          ) : null}
        </div>
        {periodControl}
      </div>
      <div className="px-2 pb-4 pt-2 sm:px-4">
        {!hasData ? (
          <p className="py-12 text-center text-sm text-muted-foreground">
            {emptyMessage}
          </p>
        ) : (
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={data}
                margin={{ top: 12, right: 12, left: 0, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="adminSignupFill" x1="0" y1="0" x2="0" y2="1">
                    <stop
                      offset="0%"
                      stopColor="var(--color-accent)"
                      stopOpacity={0.22}
                    />
                    <stop
                      offset="100%"
                      stopColor="var(--color-accent)"
                      stopOpacity={0}
                    />
                  </linearGradient>
                </defs>
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }}
                  tickFormatter={(v: string) =>
                    v.length >= 10 ? v.slice(5) : v
                  }
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }}
                  axisLine={false}
                  tickLine={false}
                  width={36}
                  allowDecimals={false}
                />
                <Tooltip
                  contentStyle={{
                    background: "var(--color-card)",
                    border: "1px solid var(--color-accent)",
                    borderRadius: 10,
                    fontSize: 12,
                    color: "var(--color-foreground)",
                  }}
                  formatter={(value) => [String(value ?? 0), valueLabel]}
                  labelFormatter={(label) => String(label)}
                />
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke="var(--color-accent)"
                  strokeWidth={2}
                  fill="url(#adminSignupFill)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </section>
  );
}
