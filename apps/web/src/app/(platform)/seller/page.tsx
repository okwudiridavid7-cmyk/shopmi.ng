"use client";

import { useMemo, useState } from "react";
import {
  ExternalLink,
  Package,
  Palette,
  Settings,
  ShoppingBag,
} from "lucide-react";
import { GreetingCard } from "@/components/dashboard/greeting-card";
import { OverviewChart } from "@/components/dashboard/overview-chart";
import { QuickActions } from "@/components/dashboard/quick-actions";
import { StatCard } from "@/components/stat-card";
import { EmptyState } from "@/components/empty-state";
import { SkeletonLines } from "@/components/skeleton";
import { SellerPlanBanner } from "@/components/seller-plan-banner";
import { formatMoney } from "@/lib/api";
import { firstNameFromUser } from "@/lib/auth-redirect";
import { buildPublicShopUrl, shopPathUrl } from "@/lib/shop-url";
import { useAuth } from "@/hooks/use-auth";
import {
  useSellerAnalytics,
  useSellerPlan,
  useSellerStats,
} from "@/hooks/use-seller";

type Period = "today" | "week" | "month";

export default function SellerOverviewPage() {
  const { user } = useAuth();
  const [period, setPeriod] = useState<Period>("month");
  const analytics = useSellerAnalytics(period);
  const todayAnalytics = useSellerAnalytics("today");
  const plan = useSellerPlan();
  const stats = useSellerStats();

  const a = analytics.data;
  const today = todayAnalytics.data;
  const firstName = firstNameFromUser(user?.name, user?.email);
  const loading = analytics.isLoading || plan.isLoading;

  const chartData = useMemo(
    () =>
      (a?.salesOverTime ?? []).map((row) => ({
        date: row.date,
        value: row.revenue,
      })),
    [a?.salesOverTime]
  );

  const planHint = plan.data
    ? plan.data.trialActive
      ? `Trial · ${plan.data.trialDaysLeft}d left`
      : plan.data.plan?.name ?? "Plan"
    : "—";

  if (loading && !a) {
    return <SkeletonLines count={5} />;
  }

  return (
    <div className="space-y-token-8">
      <GreetingCard
        firstName={firstName}
        stats={[
          {
            label: "Today's revenue",
            value: formatMoney(
              today?.totals.revenue ?? 0,
              today?.currency ?? a?.currency ?? "NGN"
            ),
          },
          {
            label: "Today's orders",
            value: String(today?.totals.orderCount ?? 0),
          },
          {
            label: "Products",
            value: String(
              a?.totals.productCount ?? stats.data?.productCount ?? 0
            ),
          },
          { label: "Plan", value: planHint },
        ]}
      />

      {plan.data && (
        <SellerPlanBanner
          trialActive={plan.data.trialActive}
          trialDaysLeft={plan.data.trialDaysLeft}
          productCount={plan.data.productCount}
          productLimit={plan.data.plan?.productLimit ?? null}
        />
      )}

      <section className="space-y-token-3">
        <div className="flex flex-wrap items-center justify-between gap-token-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Stats
          </h2>
          <div className="flex gap-token-1 rounded-md border border-border p-token-1">
            {(
              [
                ["today", "Today"],
                ["week", "Week"],
                ["month", "Month"],
              ] as const
            ).map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => setPeriod(value)}
                className={`rounded-sm px-token-3 py-token-1 text-xs font-medium transition ${
                  period === value
                    ? "bg-accent text-accent-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
        <div className="grid gap-token-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            label={`Revenue (${period})`}
            value={formatMoney(a?.totals.revenue ?? 0, a?.currency ?? "NGN")}
            type="revenue"
          />
          <StatCard
            label="Orders"
            value={String(a?.totals.orderCount ?? 0)}
            type="orders"
          />
          <StatCard
            label="Products"
            value={String(
              a?.totals.productCount ?? stats.data?.productCount ?? 0
            )}
            type="products"
          />
          <StatCard
            label="Plan status"
            value={planHint}
            type={plan.data?.trialActive ? "pending" : "generic"}
            hint={
              plan.data?.plan?.productLimit != null
                ? `${plan.data.productCount}/${plan.data.plan.productLimit} listings`
                : undefined
            }
          />
        </div>
      </section>

      <QuickActions
        actions={[
          {
            href: "/seller/products",
            label: "Add Product",
            icon: Package,
            variant: "primary",
          },
          {
            href: plan.data?.tenant?.slug
              ? buildPublicShopUrl(plan.data.tenant.slug)
              : "/seller/website",
            label: "View Store",
            icon: ExternalLink,
            external: !!plan.data?.tenant?.slug,
          },
          { href: "/seller/orders", label: "Orders", icon: ShoppingBag },
          { href: "/seller/branding", label: "Branding", icon: Palette },
          { href: "/seller/settings", label: "Settings", icon: Settings },
        ]}
      />

      <section className="space-y-token-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Insights
        </h2>
        <OverviewChart
          title="Revenue over time"
          description={`Paid sales · ${period}`}
          data={chartData}
          valueLabel="Revenue"
          formatValue={(n) => formatMoney(n, a?.currency ?? "NGN")}
          emptyMessage="Not enough data yet — revenue appears here after your first paid order."
        />
      </section>

      {!loading && a && a.totals.orderCount === 0 && (
        <EmptyState
          title="No sales in this period"
          description="When buyers check out, revenue and charts will show here."
          actionLabel="Add a product"
          actionHref="/seller/products"
          icon={Package}
        />
      )}

      {plan.data?.tenant?.slug && (
        <p className="text-sm text-muted-foreground">
          Public shop:{" "}
          <a
            href={buildPublicShopUrl(plan.data.tenant.slug)}
            target="_blank"
            rel="noopener noreferrer"
            className="text-accent underline"
          >
            {shopPathUrl(plan.data.tenant.slug)}
          </a>
        </p>
      )}
    </div>
  );
}
