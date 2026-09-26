"use client";

import { useEffect, useState } from "react";
import { CreditCard } from "lucide-react";
import type { PlanPublic, TenantPublic } from "@vendors/shared-types";
import { PageHeader } from "@/components/dashboard/page-header";
import { EmptyState, QueryErrorState } from "@/components/empty-state";
import { SkeletonLines } from "@/components/skeleton";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { apiFetch, formatMoney } from "@/lib/api";
import { usePlatformBranding } from "@/hooks/use-branding";

export default function SellerPlanPage() {
  const branding = usePlatformBranding();
  const billingOff =
    branding.isSuccess && branding.data?.billingEnabled === false;
  const [plan, setPlan] = useState<PlanPublic | null>(null);
  const [plans, setPlans] = useState<PlanPublic[]>([]);
  const [tenant, setTenant] = useState<TenantPublic | null>(null);
  const [productCount, setProductCount] = useState(0);
  const [trialActive, setTrialActive] = useState(false);
  const [trialDaysLeft, setTrialDaysLeft] = useState(0);
  const [loadError, setLoadError] = useState<unknown>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState(false);

  async function load() {
    try {
      const res = await apiFetch<{
        tenant: TenantPublic;
        plan: PlanPublic | null;
        plans: PlanPublic[];
        productCount: number;
        trialActive: boolean;
        trialDaysLeft: number;
      }>("/api/seller/plan");
      setTenant(res.tenant);
      setPlan(res.plan);
      setPlans(res.plans);
      setProductCount(res.productCount);
      setTrialActive(res.trialActive);
      setTrialDaysLeft(res.trialDaysLeft);
      setLoadError(null);
    } catch (err) {
      setLoadError(err);
    } finally {
      setLoaded(true);
    }
  }

  useEffect(() => {
    if (billingOff) {
      setLoaded(true);
      return;
    }
    void load();
  }, [billingOff]);

  async function upgrade(planId: string) {
    setActionError(null);
    setNote(null);
    setBusy(true);
    try {
      const res = await apiFetch<{ note?: string }>("/api/seller/plan/upgrade", {
        method: "POST",
        body: JSON.stringify({ planId }),
      });
      setNote(res.note ?? "Plan updated");
      await load();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Upgrade failed");
    } finally {
      setBusy(false);
    }
  }

  if (!loaded || branding.isLoading) {
    return <SkeletonLines count={4} />;
  }

  if (billingOff) {
    return (
      <EmptyState
        kind="empty"
        title="Billing is paused"
        description="Plan upgrades aren’t available right now. You can keep selling on your current access."
        icon={CreditCard}
        actionLabel="Back to dashboard"
        actionHref="/seller"
      />
    );
  }

  if (loadError) {
    return (
      <QueryErrorState
        error={loadError}
        onRetry={() => {
          void load();
        }}
      />
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Plan & billing"
        description="Yomi, Lemi, and Dami — pick the tier that fits your shop."
        icon={CreditCard}
      />

      <Card className="overflow-hidden rounded-2xl">
        <CardHeader className="bg-muted/30">
          <p className="text-sm font-semibold text-foreground">Current plan</p>
        </CardHeader>
        <CardBody>
          <p className="text-2xl font-bold tracking-tight text-foreground">
            {plan?.name ?? "No plan"}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            {productCount}
            {plan?.productLimit != null ? ` / ${plan.productLimit}` : ""}{" "}
            products
            {trialActive
              ? ` · trial ${trialDaysLeft} day${trialDaysLeft === 1 ? "" : "s"} left`
              : tenant?.trialEndsAt
                ? " · trial ended"
                : ""}
          </p>
        </CardBody>
      </Card>

      {plans.length === 0 ? (
        <EmptyState
          kind="empty"
          title="No plans available"
          description="Ask an admin to publish pricing tiers, or check back soon."
          icon={CreditCard}
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-3">
          {plans.map((p) => (
            <Card key={p.id} className="overflow-hidden rounded-2xl">
              <CardBody className="flex h-full flex-col">
                <p className="text-lg font-semibold text-foreground">{p.name}</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {formatMoney(p.price, p.currency)}
                  {p.price === 0 ? "" : "/mo"} · limit {p.productLimit ?? "∞"}
                </p>
                <Button
                  type="button"
                  variant={plan?.id === p.id ? "outline" : "primary"}
                  size="sm"
                  disabled={busy || plan?.id === p.id}
                  onClick={() => void upgrade(p.id)}
                  className="mt-4"
                >
                  {plan?.id === p.id ? "Current" : "Select"}
                </Button>
              </CardBody>
            </Card>
          ))}
        </div>
      )}

      {note && (
        <p className="text-sm text-emerald-700 dark:text-emerald-400">{note}</p>
      )}
      {actionError && (
        <p className="text-sm text-red-700 dark:text-red-400">{actionError}</p>
      )}
    </div>
  );
}
