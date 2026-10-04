"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Label } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { apiFetch, formatMoney } from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";
import { useAdminPlans, type AdminTenantDetail } from "@/hooks/use-admin";

const MONTH_OPTIONS = [1, 3, 6, 12] as const;

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

/** Start or renew a shop's plan after an offline payment. */
export function AdminTenantPlanCard({ tenant }: { tenant: AdminTenantDetail }) {
  const plansQ = useAdminPlans();
  const qc = useQueryClient();
  const activePlans = (plansQ.data ?? []).filter((p) => p.active !== false);
  const [planId, setPlanId] = useState(tenant.plan?.id ?? "");
  const [months, setMonths] = useState<number>(1);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  const selected = activePlans.find((p) => p.id === (planId || tenant.plan?.id));
  const isFree = selected ? selected.price === 0 : false;
  const renewing = selected?.id === tenant.plan?.id && !!tenant.planExpiresAt;

  const status = tenant.planExpiresAt
    ? `Paid until ${formatDate(tenant.planExpiresAt)}`
    : tenant.trialEndsAt
      ? `Trial ends ${formatDate(tenant.trialEndsAt)}`
      : tenant.status === "lapsed"
        ? "Lapsed: storefront hidden"
        : "No end date";

  async function submit() {
    if (!selected) return;
    setBusy(true);
    setMessage(null);
    try {
      const res = await apiFetch<{
        planName: string;
        planExpiresAt: string | null;
        paused: number;
        restored: number;
      }>(`/api/admin/tenants/${tenant.id}/plan`, {
        method: "POST",
        body: JSON.stringify({ planId: selected.id, months }),
      });
      const parts = [
        res.planExpiresAt
          ? `${res.planName} active until ${formatDate(res.planExpiresAt)}.`
          : `Moved to ${res.planName}.`,
        res.paused > 0 ? `${res.paused} products paused.` : "",
        res.restored > 0 ? `${res.restored} products restored.` : "",
      ];
      setMessage({ ok: true, text: parts.filter(Boolean).join(" ") });
      await qc.invalidateQueries({ queryKey: queryKeys.admin.tenant(tenant.id) });
      void qc.invalidateQueries({ queryKey: ["admin", "tenants"] });
    } catch (err) {
      setMessage({ ok: false, text: err instanceof Error ? err.message : "Could not update plan" });
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className="overflow-hidden rounded-2xl">
      <CardHeader className="bg-muted">
        <p className="text-sm font-semibold text-foreground">Plan</p>
      </CardHeader>
      <CardBody className="space-y-4 text-sm">
        <p>
          <span className="font-medium text-foreground">{tenant.plan?.name ?? "No plan"}</span>
          <span className="text-muted-foreground"> · {status}</span>
        </p>
        <div className="grid gap-3 sm:grid-cols-[1fr_10rem_auto] sm:items-end">
          <Label>
            <span>Plan</span>
            <Select value={planId} onChange={(e) => setPlanId(e.target.value)}>
              {activePlans.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.price === 0 ? "free" : `${formatMoney(p.price, p.currency)}/mo`})
                </option>
              ))}
            </Select>
          </Label>
          <Label>
            <span>Paid for</span>
            <Select
              value={String(months)}
              disabled={isFree}
              onChange={(e) => setMonths(Number(e.target.value))}
            >
              {MONTH_OPTIONS.map((m) => (
                <option key={m} value={m}>
                  {m} month{m === 1 ? "" : "s"}
                </option>
              ))}
            </Select>
          </Label>
          <Button type="button" size="sm" disabled={busy || !selected} onClick={() => void submit()}>
            {busy ? "Saving…" : isFree ? "Move to plan" : renewing ? "Renew" : "Activate"}
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          Use this after the shop has paid offline. Renewing the current plan early adds time to its
          end date. The owner gets reminder emails 5 and 2 days before it ends.
        </p>
        {message ? (
          <p className={message.ok ? "text-emerald-700 dark:text-emerald-400" : "text-red-700 dark:text-red-400"}>
            {message.text}
          </p>
        ) : null}
      </CardBody>
    </Card>
  );
}
