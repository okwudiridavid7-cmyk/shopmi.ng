"use client";

import { useState } from "react";
import Link from "next/link";
import { EmptyState } from "@/components/empty-state";
import { SkeletonLines } from "@/components/skeleton";
import { TrustBadge } from "@/components/shell/trust-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { useAdminTenants, usePatchTenant } from "@/hooks/use-admin";

function statusClass(status: string) {
  if (status === "active")
    return "bg-emerald-500/15 text-emerald-800 dark:text-emerald-300";
  if (status === "suspended")
    return "bg-red-500/15 text-red-800 dark:text-red-300";
  return "bg-amber-500/15 text-amber-900 dark:text-amber-200";
}

export default function AdminTenantsPage() {
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const { data: tenants = [], isLoading, error } = useAdminTenants(q, status);
  const patch = usePatchTenant();

  const [confirm, setConfirm] = useState<{
    id: string;
    name: string;
    action: "suspend" | "reactivate";
  } | null>(null);

  return (
    <div className="space-y-token-4">
      <div>
        <h1 className="font-display text-2xl text-foreground">Shops</h1>
        <p className="mt-token-1 text-sm text-muted-foreground">
          All tenants — search, filter, suspend, and verify.
        </p>
      </div>

      <div className="flex flex-wrap gap-token-3">
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search name, slug, owner…"
          className="max-w-xs"
        />
        <select
          className="rounded-md border border-border bg-card px-token-3 py-token-2 text-sm"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
        >
          <option value="">All statuses</option>
          <option value="pending_verification">Pending verification</option>
          <option value="active">Active</option>
          <option value="suspended">Suspended</option>
        </select>
      </div>

      {error ? (
        <p className="text-sm text-muted-foreground">
          {error instanceof Error ? error.message : "Failed to load"}
        </p>
      ) : isLoading ? (
        <SkeletonLines count={5} />
      ) : tenants.length === 0 ? (
        <EmptyState
          title="No shops match"
          description="Try a different search or status filter."
        />
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border bg-card">
          <table className="w-full min-w-[48rem] text-left text-sm">
            <thead className="border-b border-border text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-token-4 py-token-3 font-medium">Shop</th>
                <th className="px-token-4 py-token-3 font-medium">Owner</th>
                <th className="px-token-4 py-token-3 font-medium">Status</th>
                <th className="px-token-4 py-token-3 font-medium">Verified</th>
                <th className="px-token-4 py-token-3 font-medium">Plan</th>
                <th className="px-token-4 py-token-3 font-medium">Created</th>
                <th className="px-token-4 py-token-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {tenants.map((t) => (
                <tr key={t.id}>
                  <td className="px-token-4 py-token-3">
                    <Link
                      href={`/admin/tenants/${t.id}`}
                      className="font-medium hover:underline"
                    >
                      {t.name}
                    </Link>
                    <p className="text-xs text-muted-foreground">{t.slug}</p>
                  </td>
                  <td className="px-token-4 py-token-3 text-muted-foreground">
                    {t.ownerEmail}
                  </td>
                  <td className="px-token-4 py-token-3">
                    <span
                      className={`rounded-sm px-token-2 py-0.5 text-xs capitalize ${statusClass(t.status)}`}
                    >
                      {t.status.replace(/_/g, " ")}
                    </span>
                  </td>
                  <td className="px-token-4 py-token-3">
                    <TrustBadge verified={t.verifiedBadge} />
                  </td>
                  <td className="px-token-4 py-token-3 text-muted-foreground">
                    {t.plan?.name ?? "—"}
                  </td>
                  <td className="px-token-4 py-token-3 text-muted-foreground">
                    {new Date(t.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-token-4 py-token-3">
                    <div className="flex flex-wrap gap-token-1">
                      <Link href={`/admin/tenants/${t.id}`}>
                        <Button variant="outline" size="sm">
                          View
                        </Button>
                      </Link>
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={patch.isPending}
                        onClick={() =>
                          patch.mutate({
                            id: t.id,
                            verifiedBadge: !t.verifiedBadge,
                          })
                        }
                      >
                        {t.verifiedBadge ? "Unverify" : "Verify"}
                      </Button>
                      {t.status === "suspended" ? (
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() =>
                            setConfirm({
                              id: t.id,
                              name: t.name,
                              action: "reactivate",
                            })
                          }
                        >
                          Reactivate
                        </Button>
                      ) : (
                        <Button
                          variant="danger"
                          size="sm"
                          onClick={() =>
                            setConfirm({
                              id: t.id,
                              name: t.name,
                              action: "suspend",
                            })
                          }
                        >
                          Suspend
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal
        open={!!confirm}
        onClose={() => setConfirm(null)}
        title={
          confirm?.action === "suspend" ? "Suspend shop?" : "Reactivate shop?"
        }
        footer={
          <>
            <Button variant="ghost" onClick={() => setConfirm(null)}>
              Cancel
            </Button>
            <Button
              variant={confirm?.action === "suspend" ? "danger" : "primary"}
              disabled={patch.isPending}
              onClick={() => {
                if (!confirm) return;
                patch.mutate(
                  {
                    id: confirm.id,
                    status:
                      confirm.action === "suspend" ? "suspended" : "active",
                  },
                  { onSuccess: () => setConfirm(null) }
                );
              }}
            >
              {confirm?.action === "suspend" ? "Suspend" : "Reactivate"}
            </Button>
          </>
        }
      >
        <p>
          {confirm?.action === "suspend"
            ? `Suspend “${confirm?.name}”? Buyers will not be able to check out from this shop.`
            : `Reactivate “${confirm?.name}” and set status to active?`}
        </p>
      </Modal>
    </div>
  );
}
