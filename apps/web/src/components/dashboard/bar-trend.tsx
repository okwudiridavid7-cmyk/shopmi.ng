"use client";

import { useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export type TrendPoint = { date: string; value: number };

function tickLabel(v: string): string {
  if (v.length < 10) return v;
  const d = new Date(`${v.slice(0, 10)}T12:00:00`);
  if (Number.isNaN(d.getTime())) return v.slice(5);
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

/** Pads a sparse daily series (YYYY-MM-DD keys, UTC) to the last `days` days. */
export function fillDays(data: TrendPoint[], days: number): TrendPoint[] {
  const byDate = new Map(data.map((d) => [d.date.slice(0, 10), d.value]));
  const now = new Date();
  const end = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  const out: TrendPoint[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(end - i * 86_400_000).toISOString().slice(0, 10);
    out.push({ date, value: byDate.get(date) ?? 0 });
  }
  return out;
}

const compact = new Intl.NumberFormat("en", {
  notation: "compact",
  maximumFractionDigits: 1,
});

/**
 * Ink bars; the hovered (or most recent non-zero) bar is orange.
 * Fills its parent, which must be positioned and have a height.
 */
export function BarTrend({
  data,
  valueLabel,
  formatValue = (n) => String(n),
  formatTick = (n) => compact.format(n),
  yWidth = 44,
  allowDecimals = true,
}: {
  data: TrendPoint[];
  valueLabel: string;
  formatValue?: (n: number) => string;
  formatTick?: (n: number) => string;
  yWidth?: number;
  allowDecimals?: boolean;
}) {
  const [hovered, setHovered] = useState<number | null>(null);
  let lastWithValue = -1;
  data.forEach((d, i) => {
    if (d.value > 0) lastWithValue = i;
  });
  const highlight = hovered ?? lastWithValue;

  return (
    <div className="absolute inset-0">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          margin={{ top: 8, right: 4, left: 0, bottom: 0 }}
          barCategoryGap="28%"
        >
          <CartesianGrid
            stroke="var(--color-border)"
            strokeDasharray="4 4"
            vertical={false}
          />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }}
            tickFormatter={tickLabel}
            axisLine={false}
            tickLine={false}
            minTickGap={16}
          />
          <YAxis
            tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }}
            axisLine={false}
            tickLine={false}
            width={yWidth}
            allowDecimals={allowDecimals}
            tickFormatter={(v: number) => formatTick(v)}
          />
          <Tooltip
            cursor={{ fill: "var(--chart-track)", radius: 8 }}
            contentStyle={{
              background: "var(--color-ink)",
              border: "none",
              borderRadius: 12,
              fontSize: 12,
              color: "#fff",
              padding: "8px 12px",
            }}
            labelStyle={{ color: "rgb(255 255 255 / 0.6)", marginBottom: 2 }}
            itemStyle={{ color: "#fff", fontWeight: 600 }}
            formatter={(value) => [formatValue(Number(value ?? 0)), valueLabel]}
            labelFormatter={(label) => tickLabel(String(label))}
          />
          <Bar
            dataKey="value"
            radius={[6, 6, 6, 6]}
            maxBarSize={28}
            animationDuration={900}
            animationEasing="ease-out"
            onMouseEnter={(_, index) => setHovered(index)}
            onMouseLeave={() => setHovered(null)}
          >
            {data.map((row, i) => (
              <Cell
                key={row.date}
                fill={i === highlight ? "var(--color-accent)" : "var(--chart-bar)"}
                style={{ transition: "fill 0.2s ease" }}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
