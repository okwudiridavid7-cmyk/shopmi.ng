"use client";

import { useEffect, useState } from "react";
import type { PlanPublic, TenantPublic } from "@vendors/shared-types";
import { apiFetch, formatMoney } from "@/lib/api";

export default function SellerPlanPage() {
  const [plan, setPlan] = useState<PlanPublic | null>(null);
  const [plans, setPlans] = useState<PlanPublic[]>([]);
  const [tenant, setTenant] = useState<TenantPublic | null>(null);
  const [productCount, setProductCount] = useState(0);
  const [trialActive, setTrialActive] = useState(false);
  const [trialDaysLeft, setTrialDaysLeft] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);

  async function load() {
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
  }

  useEffect(() => {
    load().catch((err) =>
      setError(err instanceof Error ? err.message : "Failed to load")
    );
  }, []);

  async function upgrade(planId: string) {
    setError(null);
    setNote(null);
    try {
      const res = await apiFetch<{ note?: string }>("/api/seller/plan/upgrade", {
        method: "POST",
        body: JSON.stringify({ planId }),
      });
      setNote(res.note ?? "Plan updated");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upgrade failed");
    }
  }

  return (
    <div className="space-y-token-6">
      <div className="rounded-lg border border-border bg-card px-4 py-4">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">
          Current plan
        </p>
        <p className="mt-1 font-display text-2xl">
          {plan?.name ?? "No plan"}
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          {productCount}
          {plan?.productLimit != null ? ` / ${plan.productLimit}` : ""} products
          {trialActive
            ? ` · trial ${trialDaysLeft} day${trialDaysLeft === 1 ? "" : "s"} left`
            : tenant?.trialEndsAt
              ? " · trial ended"
              : ""}
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        {plans.map((p) => (
          <div
            key={p.id}
            className="flex flex-col rounded-lg border border-border bg-card px-4 py-4"
          >
            <p className="font-display text-lg">{p.name}</p>
            <p className="text-sm text-muted-foreground">
              {formatMoney(p.price, p.currency)}
              {p.price === 0 ? "" : "/mo"} · limit {p.productLimit ?? "∞"}
            </p>
            <button
              type="button"
              disabled={plan?.id === p.id}
              onClick={() => upgrade(p.id)}
              className="mt-4 rounded-md border border-border px-3 py-1.5 text-sm disabled:opacity-50"
            >
              {plan?.id === p.id ? "Current" : "Select"}
            </button>
          </div>
        ))}
      </div>

      {note && (
        <p className="text-sm text-emerald-700 dark:text-emerald-400">{note}</p>
      )}
      {error && (
        <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
      )}
    </div>
  );
}
