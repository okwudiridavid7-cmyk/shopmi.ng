"use client";

import type { ReactNode } from "react";
import { OverviewChart } from "@/components/dashboard/overview-chart";

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
  fillDays?: number;
};

export function AdminInsightsChart({
  title,
  totalLabel,
  comparisonText,
  data,
  valueLabel = "Signups",
  emptyMessage = "No signups yet",
  periodControl,
  fillDays,
}: Props) {
  return (
    <OverviewChart
      className="h-full"
      title={title}
      total={totalLabel}
      description={comparisonText}
      data={data}
      valueLabel={valueLabel}
      emptyMessage={emptyMessage}
      control={periodControl}
      allowDecimals={false}
      fillDays={fillDays}
    />
  );
}
