"use client";

import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowRight,
  Check,
  CreditCard,
  ExternalLink,
  Package,
  Palette,
  Settings,
  ShoppingBag,
  Store,
  X,
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
import { apiFetch, formatMoney, formatMoneyCompact } from "@/lib/api";
import { firstNameFromUser } from "@/lib/auth-redirect";
import { buildPublicShopUrl } from "@/lib/shop-url";
import { useAuth } from "@/hooks/use-auth";
import {
  useSellerAnalytics,
  useSellerPlan,
  useSellerTodaySummary,
} from "@/hooks/use-seller";
import Link from "next/link";

export default function SellerOverviewPage() {
  const { user } = useAuth();
  const [period, setPeriod] = useState<AdminPeriod>("month");
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [setupModalOpen, setSetupModalOpen] = useState(false);
  useEffect(() => {
    if (!setupModalOpen) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setSetupModalOpen(false);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [setupModalOpen]);
  const analytics = useSellerAnalytics(period, selectedDay);
  const todayAnalytics = useSellerTodaySummary();
  const plan = useSellerPlan();
  const setup = useQuery({
    queryKey: ["seller", "setup"],
    queryFn: () => apiFetch<{ progress: number; tasks: { id: string; title: string; description: string; href: string; complete: boolean }[] }>("/api/seller/setup"),
  });

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
  const productCount = a?.totals.productCount ?? 0;

  const periodName = selectedDay ?? period;
  const avgOrder =
    (a?.totals.orderCount ?? 0) > 0
      ? formatMoney((a?.totals.revenue ?? 0) / a!.totals.orderCount, currency)
      : formatMoney(0, currency);
  const productLimit = plan.data?.plan?.productLimit ?? null;
  const setupPercent = setup.data?.progress ?? 0;

  return (
    <div className="space-y-6" data-stagger>
      {setupPercent < 100 && (
        <section data-tour="seller-setup" className="rounded-2xl border border-accent/20 bg-gradient-to-r from-accent/10 via-card to-card p-5 shadow-sm sm:p-6" aria-label="Shop setup progress">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 items-center gap-4">
              <div className="relative grid h-16 w-16 shrink-0 place-items-center rounded-full" style={{ background: `conic-gradient(var(--color-accent) ${setupPercent * 3.6}deg, var(--color-muted) 0deg)` }} aria-label={`${setupPercent}% complete`}>
                <div className="grid h-[3.25rem] w-[3.25rem] place-items-center rounded-full bg-card text-sm font-bold tabular-nums text-foreground">{setupPercent}%</div>
              </div>
              <div className="min-w-0"><p className="text-xs font-bold uppercase tracking-[0.14em] text-accent">Shop setup</p><h2 className="mt-1 text-lg font-semibold text-foreground">Finish setting up your shop</h2><p className="mt-1 text-sm text-muted-foreground">Add your business details, branding, and first product to get ready for customers.</p></div>
            </div>
            <button type="button" onClick={() => setSetupModalOpen(true)} className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-lg bg-emerald-700 px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2">Continue <ArrowRight className="h-4 w-4" /></button>
          </div>
        </section>
      )}
      {setupModalOpen && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-zinc-950/60 p-3 backdrop-blur-sm sm:p-6" onClick={() => setSetupModalOpen(false)}>
          <section role="dialog" aria-modal="true" aria-labelledby="setup-modal-title" className="grid max-h-[92dvh] w-full max-w-4xl overflow-hidden rounded-3xl border border-border bg-card shadow-2xl md:grid-cols-[0.8fr_1.2fr]" onClick={(event) => event.stopPropagation()}>
            <div className="relative flex flex-col justify-between overflow-hidden bg-gradient-to-br from-emerald-800 via-emerald-900 to-zinc-950 p-6 text-white sm:p-8">
              <div className="pointer-events-none absolute -right-20 -top-16 h-64 w-64 rounded-full border-[32px] border-white/5" />
              <div className="relative"><p className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-200">Your shop, your pace</p><h2 id="setup-modal-title" className="mt-3 text-2xl font-bold leading-tight sm:text-3xl">A few details make your shop ready to sell.</h2><p className="mt-3 text-sm leading-6 text-white/75">Choose any step to continue. You can finish them in whatever order works for you.</p></div>
              <div className="relative mt-8 flex items-center gap-4 rounded-2xl border border-white/15 bg-white/10 p-4"><div className="relative grid h-16 w-16 shrink-0 place-items-center rounded-full" style={{ background: `conic-gradient(#6ee7b7 ${setupPercent * 3.6}deg, rgba(255,255,255,.16) 0deg)` }}><div className="grid h-[3.25rem] w-[3.25rem] place-items-center rounded-full bg-emerald-900 text-sm font-bold tabular-nums">{setupPercent}%</div></div><div><p className="font-semibold">Setup progress</p><p className="mt-1 text-xs text-white/65">{(setup.data?.tasks ?? []).filter((task) => task.complete).length} of {(setup.data?.tasks ?? []).length} steps complete</p></div></div>
            </div>
            <div className="flex min-h-0 flex-col">
              <div className="flex items-start justify-between gap-3 border-b border-border px-5 py-4 sm:px-7 sm:py-5"><div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-accent">Next steps</p><p className="mt-1 text-sm text-muted-foreground">Select a step to jump straight in.</p></div><button type="button" aria-label="Close setup steps" onClick={() => setSetupModalOpen(false)} className="rounded-full p-2 text-muted-foreground transition hover:bg-muted hover:text-foreground"><X className="h-5 w-5" /></button></div>
              <div className="min-h-0 space-y-2 overflow-y-auto p-4 sm:p-6">{(setup.data?.tasks ?? []).map((task, index) => <Link key={task.id} href={task.href} onClick={() => setSetupModalOpen(false)} className={`group flex items-center gap-4 rounded-2xl border p-4 transition ${task.complete ? "border-emerald-200 bg-emerald-50/60 dark:border-emerald-900 dark:bg-emerald-950/20" : "border-border bg-card hover:border-emerald-500/50 hover:bg-emerald-500/5"}`}><span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl text-sm font-bold ${task.complete ? "bg-emerald-600 text-white" : "bg-muted text-muted-foreground group-hover:bg-emerald-700 group-hover:text-white"}`}>{task.complete ? <Check className="h-5 w-5" /> : String(index + 1).padStart(2, "0")}</span><span className="min-w-0 flex-1"><span className="flex flex-wrap items-center gap-2"><span className={`font-semibold ${task.complete ? "text-emerald-800 dark:text-emerald-300" : "text-foreground"}`}>{task.title}</span>{task.complete && <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-200">Complete</span>}</span><span className="mt-1 block text-sm leading-5 text-muted-foreground">{task.description}</span></span>{task.complete ? <Check className="h-4 w-4 shrink-0 text-emerald-700" /> : <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground transition group-hover:translate-x-1 group-hover:text-emerald-700" />}</Link>)}</div>
              <div className="border-t border-border px-5 py-3 text-xs text-muted-foreground sm:px-7">{(setup.data?.tasks ?? []).filter((task) => !task.complete).length} steps remaining · Your progress is saved as you go.</div>
            </div>
          </section>
        </div>
      )}
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
              value={formatMoney(today?.revenue ?? 0, currency)}
              icon={<ShoppingBag className="h-4 w-4" aria-hidden />}
            />
            <AdminHeroMetric
              label="Today's orders"
              value={String(today?.orderCount ?? 0)}
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
            {
              href: "/seller/website?tab=branding",
              label: "Branding",
              icon: Palette,
            },
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

    </div>
  );
}
