"use client";

import { useMemo, useState } from "react";
import {
  CreditCard,
  ExternalLink,
  Package,
  Palette,
  Settings,
  ShoppingBag,
  Store,
} from "lucide-react";
import {
  AdminHero,
  AdminHeroMetric,
} from "@/components/dashboard/admin/admin-hero";
import { AdminMetricCard } from "@/components/dashboard/admin/admin-metric-card";
import {
  AdminPeriodToggle,
  type AdminPeriod,
} from "@/components/dashboard/admin/admin-period-toggle";
import { OverviewChart } from "@/components/dashboard/overview-chart";
import { QuickActions } from "@/components/dashboard/quick-actions";
import { EmptyState, QueryErrorState } from "@/components/empty-state";
import { SkeletonLines } from "@/components/skeleton";
import { SellerPlanBanner } from "@/components/seller-plan-banner";
import { TextLink } from "@/components/ui/text-link";
import { formatMoney, formatMoneyCompact } from "@/lib/api";
import { firstNameFromUser } from "@/lib/auth-redirect";
import { buildPublicShopUrl, shopPathUrl } from "@/lib/shop-url";
import { useAuth } from "@/hooks/use-auth";
import {
  useSellerAnalytics,
  useSellerPlan,
  useSellerStats,
} from "@/hooks/use-seller";

export default function SellerOverviewPage() {
  const { user } = useAuth();
  const [period, setPeriod] = useState<AdminPeriod>("month");
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const analytics = useSellerAnalytics(period, selectedDay);
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
    : "-";

  if (analytics.isError && !a) {
    return (
      <QueryErrorState
        error={analytics.error}
        onRetry={() => {
          void analytics.refetch();
        }}
      />
    );
  }

  if (loading && !a) {
    return <SkeletonLines count={5} />;
  }

  const currency = today?.currency ?? a?.currency ?? "NGN";
  const productCount =
    a?.totals.productCount ?? stats.data?.productCount ?? 0;

  const periodName = selectedDay ?? period;
  const avgOrder =
    (a?.totals.orderCount ?? 0) > 0
      ? formatMoney((a?.totals.revenue ?? 0) / a!.totals.orderCount, currency)
      : formatMoney(0, currency);
  const productLimit = plan.data?.plan?.productLimit ?? null;

  return (
    <div className="space-y-6" data-stagger>
      <AdminHero
        firstName={firstName}
        subtitle="Here's what's happening in your shop today."
        badges={[
          {
            icon: <Store className="h-3.5 w-3.5" aria-hidden />,
            label: plan.data?.tenant?.name ?? "Seller",
          },
        ]}
        selectedDay={selectedDay}
        onSelectedDayChange={setSelectedDay}
        trailing={
          selectedDay ? null : (
            <AdminPeriodToggle tone="onInk" value={period} onChange={setPeriod} />
          )
        }
        metrics={
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4" data-stagger>
            <AdminHeroMetric
              featured
              label="Today's revenue"
              value={formatMoney(today?.totals.revenue ?? 0, currency)}
              icon={<ShoppingBag className="h-4 w-4" aria-hidden />}
            />
            <AdminHeroMetric
              label="Today's orders"
              value={String(today?.totals.orderCount ?? 0)}
              icon={<Package className="h-4 w-4" aria-hidden />}
            />
            <AdminHeroMetric
              label="Live products"
              value={String(productCount)}
              icon={<Package className="h-4 w-4" aria-hidden />}
            />
            <AdminHeroMetric
              label="Plan"
              value={planHint}
              hint={
                productLimit != null
                  ? `${plan.data!.liveCount}/${productLimit} live`
                  : undefined
              }
              progress={
                productLimit ? (plan.data?.liveCount ?? 0) / productLimit : undefined
              }
              icon={<CreditCard className="h-4 w-4" aria-hidden />}
            />
          </div>
        }
      />

      {plan.data && (
        <SellerPlanBanner
          trialActive={plan.data.trialActive}
          daysLeft={plan.data.daysLeft}
          paidUntil={plan.data.planExpiresAt}
          lapsed={plan.data.lapsed}
          planName={plan.data.plan?.name ?? null}
          liveCount={plan.data.liveCount}
          pausedCount={plan.data.pausedCount}
          productLimit={productLimit}
        />
      )}

      <div className="grid gap-4 xl:grid-cols-3">
        <OverviewChart
          className="xl:col-span-2"
          title="Revenue"
          total={formatMoney(a?.totals.revenue ?? 0, currency)}
          description={`Paid sales · ${periodName}`}
          data={chartData}
          valueLabel="Revenue"
          formatValue={(n) => formatMoney(n, currency)}
          formatTick={(n) => formatMoneyCompact(n, currency)}
          fillDays={selectedDay || period === "today" ? undefined : period === "week" ? 7 : 30}
          emptyMessage="No revenue yet"
        />
        <QuickActions
          actions={[
            {
              href: "/seller/products",
              label: "Add product",
              icon: Package,
              variant: "primary",
            },
            {
              href: plan.data?.tenant?.slug
                ? buildPublicShopUrl(plan.data.tenant.slug)
                : "/seller/website",
              label: "View store",
              icon: ExternalLink,
              external: !!plan.data?.tenant?.slug,
            },
            { href: "/seller/orders", label: "Orders", icon: ShoppingBag },
            { href: "/seller/branding", label: "Branding", icon: Palette },
            { href: "/seller/settings", label: "Settings", icon: Settings },
          ]}
        />
      </div>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Period insights
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4" data-stagger>
          <AdminMetricCard
            label="Paid orders"
            value={String(a?.totals.orderCount ?? 0)}
            type="orders"
            hint={`${a?.totals.allOrderCount ?? a?.totals.orderCount ?? 0} total created`}
            help="Paid/fulfilled orders in this window"
          />
          <AdminMetricCard
            label="Avg order value"
            value={avgOrder}
            type="revenue"
            help="Average value of paid orders in this window"
          />
          <AdminMetricCard
            label="Conversion"
            value={`${a?.totals.conversionRate ?? 0}%`}
            type="pending"
            help="Share of checkouts that completed payment"
          />
          <AdminMetricCard
            label="Awaiting payment"
            value={String(a?.totals.pendingOrderCount ?? 0)}
            type="plan"
            help="Orders still pending payment"
          />
        </div>
      </section>

      {!loading && a && a.totals.orderCount === 0 && (
        <EmptyState
          kind="orders"
          title="No sales in this period"
          actionLabel="Add a product"
          actionHref="/seller/products"
          icon={Package}
        />
      )}

      {plan.data?.tenant?.slug && (
        <p className="text-sm text-muted-foreground">
          Public shop:{" "}
          <TextLink
            href={buildPublicShopUrl(plan.data.tenant.slug)}
            target="_blank"
            rel="noopener noreferrer"
          >
            {shopPathUrl(plan.data.tenant.slug)}
          </TextLink>
        </p>
      )}
    </div>
  );
}
