import type { LucideIcon } from "lucide-react";
import {
  Banknote,
  Clock,
  CreditCard,
  Heart,
  HelpCircle,
  Package,
  ShoppingBag,
  Store,
  Users,
} from "lucide-react";

export type AdminMetricType =
  | "shops"
  | "users"
  | "revenue"
  | "pending"
  | "products"
  | "orders"
  | "favorites"
  | "plan";

const META: Record<
  AdminMetricType,
  { icon: LucideIcon; chipClass: string; stroke: string }
> = {
  shops: {
    icon: Store,
    chipClass: "bg-accent-soft text-accent dark:text-accent-on-dark",
    stroke: "var(--color-accent)",
  },
  users: {
    icon: Users,
    chipClass: "bg-info-muted text-info",
    stroke: "var(--color-info)",
  },
  revenue: {
    icon: Banknote,
    chipClass: "bg-success-muted text-success",
    stroke: "var(--color-success)",
  },
  pending: {
    icon: Clock,
    chipClass: "bg-warning-muted text-warning",
    stroke: "var(--color-warning)",
  },
  products: {
    icon: Package,
    chipClass: "bg-accent-soft text-accent dark:text-accent-on-dark",
    stroke: "var(--color-accent)",
  },
  orders: {
    icon: ShoppingBag,
    chipClass: "bg-info-muted text-info",
    stroke: "var(--color-info)",
  },
  favorites: {
    icon: Heart,
    chipClass: "bg-danger-muted text-danger",
    stroke: "var(--color-danger)",
  },
  plan: {
    icon: CreditCard,
    chipClass: "bg-warning-muted text-warning",
    stroke: "var(--color-warning)",
  },
};

export type SparkPoint = { value: number };

export type AdminMetricCardProps = {
  label: string;
  value: string;
  hint?: string;
  type: AdminMetricType;
  /** Optional sparkline from real time-series data. */
  sparkline?: SparkPoint[];
  /** Real trend label e.g. "12.4%" — omit when unavailable. */
  trend?: string;
  trendDirection?: "up" | "down";
  /** Optional help tooltip text — shows a ? control when set. */
  help?: string;
  className?: string;
};

function Sparkline({
  points,
  stroke,
  gradientId,
}: {
  points: SparkPoint[];
  stroke: string;
  gradientId: string;
}) {
  if (points.length < 2) return null;
  const values = points.map((p) => p.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const w = 160;
  const h = 48;
  const padX = 2;
  const padY = 4;
  const coords = values.map((v, i) => {
    const x = padX + (i / (values.length - 1)) * (w - padX * 2);
    const y = h - padY - ((v - min) / range) * (h - padY * 2);
    return { x, y };
  });
  const line = coords.map((c) => `${c.x},${c.y}`).join(" L ");
  const last = coords[coords.length - 1]!;
  const area = `M ${coords[0]!.x},${h} L ${line} L ${last.x},${h} Z`;

  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      className="mt-4 h-12 w-full"
      aria-hidden
      preserveAspectRatio="none"
    >
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={stroke} stopOpacity={0.35} />
          <stop offset="100%" stopColor={stroke} stopOpacity={0} />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#${gradientId})`} />
      <path
        d={`M ${line}`}
        fill="none"
        stroke={stroke}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx={last.x} cy={last.y} r="3" fill={stroke} />
    </svg>
  );
}

/**
 * Reusable admin KPI card — fintech layout:
 * icon + label | help · large value + optional trend · optional area sparkline.
 */
export function AdminMetricCard({
  label,
  value,
  hint,
  type,
  sparkline,
  trend,
  trendDirection,
  help,
  className = "",
}: AdminMetricCardProps) {
  const meta = META[type];
  const Icon = meta.icon;
  const hasSpark = (sparkline?.length ?? 0) >= 2;

  return (
    <article
      className={`rounded-xl border border-border bg-card p-5 shadow-sm ${className}`}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <span
            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${meta.chipClass}`}
          >
            <Icon className="h-3.5 w-3.5" aria-hidden />
          </span>
          <p className="truncate text-sm font-medium text-muted-foreground">
            {label}
          </p>
        </div>
        {help ? (
          <span
            className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-muted-foreground"
            title={help}
            aria-label={help}
          >
            <HelpCircle className="h-3.5 w-3.5" aria-hidden />
          </span>
        ) : null}
      </div>

      <div className="mt-4 flex flex-wrap items-baseline gap-2">
        <p className="text-[1.65rem] font-bold leading-none tracking-tight text-foreground sm:text-[1.85rem]">
          {value}
        </p>
        {trend ? (
          <span
            className={`text-sm font-semibold ${
              trendDirection === "down" ? "text-danger" : "text-success"
            }`}
          >
            {trendDirection === "down" ? "↘" : "↗"} {trend}
          </span>
        ) : null}
      </div>

      {hint ? (
        <p className="mt-1.5 text-xs text-muted-foreground">{hint}</p>
      ) : null}

      {hasSpark ? (
        <Sparkline
          points={sparkline!}
          stroke={meta.stroke}
          gradientId={`metric-spark-${type}-${label.replace(/\s+/g, "-").toLowerCase()}`}
        />
      ) : null}
    </article>
  );
}
