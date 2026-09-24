"use client";

import type { LucideIcon } from "lucide-react";
import {
  Banknote,
  Clock,
  Package,
  ShoppingBag,
  Store,
  TrendingDown,
  TrendingUp,
  Users,
} from "lucide-react";
import { Card, CardBody } from "@/components/ui/card";

export type StatCardType =
  | "revenue"
  | "orders"
  | "shops"
  | "users"
  | "products"
  | "pending"
  | "generic";

const STAT_META: Record<
  StatCardType,
  { icon: LucideIcon; accentClass: string; bgClass: string }
> = {
  revenue: {
    icon: Banknote,
    accentClass: "text-success",
    bgClass: "bg-success/10",
  },
  orders: {
    icon: ShoppingBag,
    accentClass: "text-accent",
    bgClass: "bg-accent/10",
  },
  shops: {
    icon: Store,
    accentClass: "text-accent",
    bgClass: "bg-accent/10",
  },
  users: {
    icon: Users,
    accentClass: "text-accent",
    bgClass: "bg-accent/10",
  },
  products: {
    icon: Package,
    accentClass: "text-accent",
    bgClass: "bg-accent/10",
  },
  pending: {
    icon: Clock,
    accentClass: "text-warning",
    bgClass: "bg-warning-muted/40",
  },
  generic: {
    icon: Banknote,
    accentClass: "text-muted-foreground",
    bgClass: "bg-muted",
  },
};

export function StatCard({
  label,
  value,
  hint,
  type = "generic",
  trend,
  trendDirection,
}: {
  label: string;
  value: string;
  hint?: string;
  type?: StatCardType;
  trend?: string;
  trendDirection?: "up" | "down";
}) {
  const meta = STAT_META[type];
  const Icon = meta.icon;
  const TrendIcon = trendDirection === "down" ? TrendingDown : TrendingUp;

  return (
    <Card className="overflow-hidden shadow-sm transition motion-safe:duration-200 motion-safe:hover:-translate-y-0.5 motion-safe:hover:shadow-md">
      <CardBody className="space-y-token-4 p-token-5">
        <div className="flex items-start justify-between gap-token-3">
          <div
            className={`flex h-10 w-10 items-center justify-center rounded-lg ${meta.bgClass}`}
          >
            <Icon className={`h-5 w-5 ${meta.accentClass}`} aria-hidden />
          </div>
          {trend && (
            <span
              className={`inline-flex items-center gap-1 text-xs font-medium ${
                trendDirection === "down" ? "text-danger" : "text-success"
              }`}
            >
              <TrendIcon className="h-3.5 w-3.5" aria-hidden />
              {trend}
            </span>
          )}
        </div>
        <div className="space-y-token-1">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {label}
          </p>
          <p className="font-display text-2xl tracking-tight text-foreground">
            {value}
          </p>
          {hint && (
            <p className="text-xs leading-relaxed text-muted-foreground">
              {hint}
            </p>
          )}
        </div>
      </CardBody>
    </Card>
  );
}
