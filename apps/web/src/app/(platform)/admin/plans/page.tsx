"use client";

import { FormEvent, useState } from "react";
import type { PlanPublic } from "@vendors/shared-types";
import { Layers } from "lucide-react";
import { PageHeader } from "@/components/dashboard/page-header";
import { EmptyState, QueryErrorState } from "@/components/empty-state";
import { SkeletonLines } from "@/components/skeleton";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Input, Label } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { formatMoney, apiFetch } from "@/lib/api";
import {
  useAdminPlans,
  useInvalidateAdminPlans,
} from "@/hooks/use-admin";

const emptyForm = {
  name: "",
  slug: "",
  price: "0",
  currency: "NGN",
  productLimit: "",
  trialDays: "3",
  featureFlags: "{}",
  active: true,
};

export default function AdminPlansPage() {
  const { data: plans = [], isLoading, error, refetch } = useAdminPlans();
  const invalidate = useInvalidateAdminPlans();
  const [form, setForm] = useState(emptyForm);
  const [editing, setEditing] = useState<PlanPublic | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<PlanPublic | null>(null);

  function openCreate() {
    setEditing(null);
    setForm(emptyForm);
    setErr(null);
  }

  function openEdit(p: PlanPublic) {
    setEditing(p);
    setForm({
      name: p.name,
      slug: p.slug,
      price: String(p.price),
      currency: p.currency,
      productLimit: p.productLimit != null ? String(p.productLimit) : "",
      trialDays: String(p.trialDays),
      featureFlags: JSON.stringify(p.featureFlags ?? {}, null, 0),
      active: p.active !== false,
    });
    setErr(null);
  }

  async function save(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    try {
      let featureFlags: Record<string, unknown> = {};
      try {
        featureFlags = JSON.parse(form.featureFlags || "{}") as Record<
          string,
          unknown
        >;
      } catch {
        throw new Error("feature_flags must be valid JSON");
      }
      const payload = {
        name: form.name,
        slug: form.slug,
        price: Number(form.price),
        currency: form.currency,
        productLimit: form.productLimit ? Number(form.productLimit) : null,
        trialDays: Number(form.trialDays),
        featureFlags,
        active: form.active,
      };
      if (editing) {
        await apiFetch(`/api/admin/plans/${editing.id}`, {
          method: "PATCH",
          body: JSON.stringify(payload),
        });
      } else {
        await apiFetch("/api/admin/plans", {
          method: "POST",
          body: JSON.stringify(payload),
        });
      }
      setEditing(null);
      setForm(emptyForm);
      invalidate();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Save failed");
    } finally {
      setBusy(false);
    }
  }

  async function removePlan() {
    if (!deleteTarget) return;
    setBusy(true);
    try {
      await apiFetch(`/api/admin/plans/${deleteTarget.id}`, {
        method: "DELETE",
      });
      setDeleteTarget(null);
      invalidate();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Delete failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Plans"
        description="Pricing tiers — product limits, trial days, and feature flags."
        icon={Layers}
      />

      {error ? (
        <QueryErrorState
          error={error}
          onRetry={() => {
            void refetch();
          }}
          sellerHomeHref="/admin"
        />
      ) : isLoading ? (
        <SkeletonLines count={3} />
      ) : plans.length === 0 ? (
        <EmptyState
          kind="empty"
          title="No plans"
          description="Create a plan so new shops can be assigned a tier."
          actionLabel="Create plan"
          onAction={openCreate}
        />
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-border bg-card shadow-sm">
          <table className="w-full min-w-[40rem] text-left text-sm">
            <thead className="border-b border-border bg-muted/30 text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Price</th>
                <th className="px-4 py-3 font-medium">Product limit</th>
                <th className="px-4 py-3 font-medium">Trial days</th>
                <th className="px-4 py-3 font-medium">Active</th>
                <th className="px-4 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {plans.map((p) => (
                <tr key={p.id} className="hover:bg-muted/20">
                  <td className="px-4 py-3">
                    <p className="font-medium">{p.name}</p>
                    <p className="text-xs text-muted-foreground">{p.slug}</p>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {formatMoney(p.price, p.currency)}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {p.productLimit ?? "Unlimited"}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {p.trialDays}
                  </td>
                  <td className="px-4 py-3">
                    {p.active === false ? "No" : "Yes"}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openEdit(p)}
                      >
                        Edit
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setDeleteTarget(p)}
                      >
                        Delete
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Card className="overflow-hidden rounded-2xl">
        <CardHeader className="flex flex-wrap items-center justify-between gap-2 bg-muted/30">
          <p className="text-sm font-semibold text-foreground">
            {editing ? `Edit ${editing.name}` : "Create plan"}
          </p>
          {editing && (
            <Button variant="ghost" size="sm" onClick={openCreate}>
              New instead
            </Button>
          )}
        </CardHeader>
        <CardBody>
          <form onSubmit={save} className="grid max-w-lg gap-3">
            <Label>
              <span>Name</span>
              <Input
                required
                value={form.name}
                onChange={(e) =>
                  setForm((f) => ({ ...f, name: e.target.value }))
                }
              />
            </Label>
            <Label>
              <span>Slug</span>
              <Input
                required
                value={form.slug}
                onChange={(e) =>
                  setForm((f) => ({ ...f, slug: e.target.value }))
                }
              />
            </Label>
            <div className="grid gap-3 sm:grid-cols-2">
              <Label>
                <span>Price</span>
                <Input
                  required
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.price}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, price: e.target.value }))
                  }
                />
              </Label>
              <Label>
                <span>Currency</span>
                <Input
                  required
                  value={form.currency}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, currency: e.target.value }))
                  }
                />
              </Label>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <Label>
                <span>Product limit (blank = unlimited)</span>
                <Input
                  type="number"
                  min="1"
                  value={form.productLimit}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, productLimit: e.target.value }))
                  }
                />
              </Label>
              <Label>
                <span>Trial days</span>
                <Input
                  type="number"
                  min="0"
                  value={form.trialDays}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, trialDays: e.target.value }))
                  }
                />
              </Label>
            </div>
            <Label>
              <span>Feature flags (JSON)</span>
              <Input
                value={form.featureFlags}
                onChange={(e) =>
                  setForm((f) => ({ ...f, featureFlags: e.target.value }))
                }
              />
            </Label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.active}
                onChange={(e) =>
                  setForm((f) => ({ ...f, active: e.target.checked }))
                }
              />
              Active
            </label>
            {err && (
              <p className="text-sm text-red-700 dark:text-red-400">{err}</p>
            )}
            <Button type="submit" disabled={busy} variant="primary">
              {busy ? "Saving…" : editing ? "Update plan" : "Create plan"}
            </Button>
          </form>
        </CardBody>
      </Card>

      <Modal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="Delete plan?"
        footer={
          <>
            <Button variant="ghost" onClick={() => setDeleteTarget(null)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              disabled={busy}
              onClick={() => void removePlan()}
            >
              Delete
            </Button>
          </>
        }
      >
        <p>
          Delete “{deleteTarget?.name}”? This fails if any shop still uses the
          plan.
        </p>
      </Modal>
    </div>
  );
}
