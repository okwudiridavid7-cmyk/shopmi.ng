"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { CreditCard } from "lucide-react";
import type { PlanPublic } from "@vendors/shared-types";
import { PageHeader } from "@/components/dashboard/page-header";
import { EmptyState, QueryErrorState } from "@/components/empty-state";
import { SkeletonLines } from "@/components/skeleton";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { TextLink } from "@/components/ui/text-link";
import { apiFetch, formatMoney } from "@/lib/api";
import { usePlatformBranding } from "@/hooks/use-branding";
import { useSellerPlan, type SellerPlanInfo } from "@/hooks/use-seller";

function planBenefits(p: Pick<PlanPublic, "featureFlags">): string[] {
  const f = (p.featureFlags ?? {}) as Record<string, unknown>;
  return Array.isArray(f.benefits)
    ? (f.benefits as unknown[]).filter((x): x is string => typeof x === "string")
    : [];
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function limitLabel(limit: number | null) {
  return limit == null ? "Unlimited products" : `${limit} live products`;
}

export default function SellerPlanPage() {
  const branding = usePlatformBranding();
  const billingOff =
    branding.isSuccess && branding.data?.billingEnabled === false;
  const queryClient = useQueryClient();
  const planQ = useSellerPlan();
  const [actionError, setActionError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function choose(target: SellerPlanInfo["plans"][number], info: SellerPlanInfo) {
    setActionError(null);
    setNote(null);
    const overBy =
      target.productLimit != null ? info.liveCount - target.productLimit : 0;
    const warnings = [
      info.planExpiresAt && target.price === 0 && info.daysLeft > 0
        ? `You'll give up the ${info.daysLeft} day${info.daysLeft === 1 ? "" : "s"} left on ${info.plan?.name ?? "your plan"}.`
        : "",
      overBy > 0
        ? `${target.name} allows ${target.productLimit} live products, so ${overBy} of your products will be paused (hidden, not deleted).`
        : "",
    ].filter(Boolean);
    if (warnings.length > 0 && !window.confirm(`${warnings.join(" ")} Continue?`)) {
      return;
    }
    setBusyId(target.id);
    try {
      const res = await apiFetch<{ paused: number; restored: number }>(
        "/api/seller/plan/upgrade",
        { method: "POST", body: JSON.stringify({ planId: target.id }) }
      );
      setNote(
        res.paused > 0
          ? `You're on ${target.name}. ${res.paused} product${res.paused === 1 ? " was" : "s were"} paused.`
          : res.restored > 0
            ? `You're on ${target.name}. ${res.restored} paused product${res.restored === 1 ? " is" : "s are"} live again.`
            : `You're on ${target.name}.`
      );
      await queryClient.invalidateQueries({ queryKey: ["seller"] });
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Could not change plan");
    } finally {
      setBusyId(null);
    }
  }

  if (branding.isLoading || (!billingOff && planQ.isLoading)) {
    return <SkeletonLines count={4} />;
  }

  if (billingOff) {
    return (
      <EmptyState
        kind="empty"
        title="Billing is paused"
        icon={CreditCard}
        actionLabel="Back to dashboard"
        actionHref="/seller"
      />
    );
  }

  if (planQ.isError || !planQ.data) {
    return <QueryErrorState error={planQ.error} onRetry={() => void planQ.refetch()} />;
  }

  const info = planQ.data;
  const {
    plan,
    plans,
    trialActive,
    trialDaysLeft,
    liveCount,
    pausedCount,
    planExpiresAt,
    daysLeft,
    lapsed,
  } = info;
  const freePlan = plans.find((p) => p.price === 0);

  return (
    <div className="space-y-6">
      <PageHeader title="Plan & billing" icon={CreditCard} />

      {lapsed ? (
        <div
          role="alert"
          className="rounded-2xl border border-danger bg-[color-mix(in_oklab,var(--color-danger)_8%,transparent)] p-4 text-sm text-foreground"
        >
          <p className="font-semibold">Your storefront is unavailable to shoppers.</p>
          <p className="mt-1 text-muted-foreground">
            Your plan has ended. Your dashboard still works and you can fulfil existing orders.
            Choose a plan below or <TextLink href="/contact">contact us</TextLink> to renew, and your
            shop comes back straight away.
          </p>
        </div>
      ) : null}

      <Card className="overflow-hidden rounded-2xl">
        <CardHeader className="bg-muted">
          <p className="text-sm font-semibold text-foreground">Current plan</p>
        </CardHeader>
        <CardBody className="space-y-2">
          <p className="text-2xl font-bold tracking-tight text-foreground">
            {plan?.name ?? "No plan"}
            {trialActive ? (
              <span className="ml-2 align-middle text-sm font-medium text-muted-foreground">
                trial, {trialDaysLeft} day{trialDaysLeft === 1 ? "" : "s"} left
              </span>
            ) : planExpiresAt ? (
              <span className="ml-2 align-middle text-sm font-medium text-muted-foreground">
                paid until {formatDate(planExpiresAt)}
              </span>
            ) : null}
          </p>
          <p className="text-sm text-muted-foreground">
            {liveCount}
            {plan?.productLimit != null ? ` of ${plan.productLimit}` : ""} live products
            {pausedCount > 0 ? `, ${pausedCount} paused` : ""}
          </p>
          {trialActive && freePlan ? (
            <p className="text-sm text-muted-foreground">
              When your trial ends, your shop moves to {freePlan.name} (
              {limitLabel(freePlan.productLimit).toLowerCase()}).
              {freePlan.productLimit != null && liveCount > freePlan.productLimit
                ? ` Your ${freePlan.productLimit} most recently updated products stay live and the rest are paused. Nothing is deleted.`
                : ""}
            </p>
          ) : null}
          {planExpiresAt && freePlan ? (
            <p className="text-sm text-muted-foreground">
              {daysLeft} day{daysLeft === 1 ? "" : "s"} left. We’ll email you 5 and 2 days before it
              ends. If it isn’t renewed, your shop moves to {freePlan.name} (
              {limitLabel(freePlan.productLimit).toLowerCase()}). Existing orders aren’t affected.
            </p>
          ) : null}
          {pausedCount > 0 ? (
            <p className="text-sm text-foreground">
              Paused products are hidden from shoppers because your plan allows{" "}
              {plan?.productLimit} live products. Unpublish a live product to make room,
              or move to a bigger plan and they come back automatically.{" "}
              <TextLink href="/seller/products">Review products</TextLink>
            </p>
          ) : null}
        </CardBody>
      </Card>

      {plans.length === 0 ? (
        <EmptyState kind="empty" title="No plans available" icon={CreditCard} />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {plans.map((p) => {
            const current = plan?.id === p.id;
            const paidLocked = p.price > 0 && !trialActive && !current;
            return (
              <Card key={p.id} className="overflow-hidden rounded-2xl">
                <CardBody className="flex h-full flex-col">
                  <p className="text-lg font-semibold text-foreground">{p.name}</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {p.price === 0 ? "Free" : `${formatMoney(p.price, p.currency)}/mo`} ·{" "}
                    {limitLabel(p.productLimit).toLowerCase()}
                  </p>
                  <ul className="mt-3 flex-1 space-y-1 text-sm text-muted-foreground">
                    {planBenefits(p)
                      .filter((b) => !/live products|unlimited products/i.test(b))
                      .map((b) => (
                        <li key={b}>{b}</li>
                      ))}
                  </ul>
                  <Button
                    type="button"
                    variant={current ? "outline" : "primary"}
                    size="sm"
                    disabled={current || paidLocked || busyId !== null}
                    onClick={() => void choose(p, info)}
                    className="mt-4"
                  >
                    {current
                      ? "Current plan"
                      : busyId === p.id
                        ? "Switching…"
                        : paidLocked
                          ? "Available soon"
                          : `Switch to ${p.name}`}
                  </Button>
                </CardBody>
              </Card>
            );
          })}
        </div>
      )}

      {!trialActive && plans.some((p) => p.price > 0) ? (
        <p className="text-sm text-muted-foreground">
          Online payment for paid plans is coming soon.{" "}
          <TextLink href="/contact">Contact us</TextLink>{" "}
          {planExpiresAt ? "to renew or change your plan." : "if you need a bigger plan now."}
        </p>
      ) : null}

      {note && <p className="text-sm text-emerald-700 dark:text-emerald-400">{note}</p>}
      {actionError && <p className="text-sm text-red-700 dark:text-red-400">{actionError}</p>}
    </div>
  );
}
