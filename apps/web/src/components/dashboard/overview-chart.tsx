"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card, CardBody, CardHeader } from "@/components/ui/card";

export type ChartPoint = {
  date: string;
  value: number;
  label?: string;
};

type Props = {
  title: string;
  description?: string;
  data: ChartPoint[];
  valueLabel?: string;
  emptyMessage?: string;
  formatValue?: (n: number) => string;
};

export function OverviewChart({
  title,
  description,
  data,
  valueLabel = "Value",
  emptyMessage = "Not enough data yet — check back after more activity.",
  formatValue = (n) => String(n),
}: Props) {
  const hasData = data.some((d) => d.value > 0);

  return (
    <Card>
      <CardHeader>
        <p className="text-sm font-medium text-foreground">{title}</p>
        {description && (
          <p className="mt-token-1 text-xs text-muted-foreground">{description}</p>
        )}
      </CardHeader>
      <CardBody>
        {!hasData ? (
          <p className="py-token-8 text-center text-sm text-muted-foreground">
            {emptyMessage}
          </p>
        ) : (
          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={data}
                margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="overviewFill" x1="0" y1="0" x2="0" y2="1">
                    <stop
                      offset="0%"
                      stopColor="var(--color-accent)"
                      stopOpacity={0.35}
                    />
                    <stop
                      offset="100%"
                      stopColor="var(--color-accent)"
                      stopOpacity={0}
                    />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  stroke="var(--color-border)"
                  strokeDasharray="3 3"
                  vertical={false}
                />
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
                  width={48}
                  tickFormatter={(v: number) => formatValue(v)}
                />
                <Tooltip
                  contentStyle={{
                    background: "var(--color-card)",
                    border: "1px solid var(--color-border)",
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                  formatter={(value) => [
                    formatValue(Number(value ?? 0)),
                    valueLabel,
                  ]}
                  labelFormatter={(label) => String(label)}
                />
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke="var(--color-accent)"
                  strokeWidth={2}
                  fill="url(#overviewFill)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardBody>
    </Card>
  );
}
