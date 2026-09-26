"use client";

import { useState } from "react";
import Link from "next/link";
import { Filter, Search, Store } from "lucide-react";
import { PageHeader } from "@/components/dashboard/page-header";
import { EmptyState, QueryErrorState } from "@/components/empty-state";
import { SkeletonLines } from "@/components/skeleton";
import { TrustBadge } from "@/components/shell/trust-badge";
import { Button } from "@/components/ui/button";
import { InputWithIcon } from "@/components/ui/input-with-icon";
import { Modal } from "@/components/ui/modal";
import { Select } from "@/components/ui/select";
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
  const { data: tenants = [], isLoading, error, refetch } = useAdminTenants(
    q,
    status
  );
  const patch = usePatchTenant();

  const [confirm, setConfirm] = useState<{
    id: string;
    name: string;
    action: "suspend" | "reactivate";
  } | null>(null);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Shops"
        description="All tenants — search, filter, suspend, and verify."
        icon={Store}
      />

      <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-border bg-muted/30 p-3">
        <div className="w-full max-w-xs">
          <InputWithIcon
            icon={<Search />}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search name, slug, owner…"
          />
        </div>
        <div className="w-full max-w-[16rem]">
          <Select
            icon={<Filter />}
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            <option value="">All statuses</option>
            <option value="pending_verification">Pending verification</option>
            <option value="active">Active</option>
            <option value="suspended">Suspended</option>
          </Select>
        </div>
      </div>

      {error ? (
        <QueryErrorState
          error={error}
          onRetry={() => {
            void refetch();
          }}
          sellerHomeHref="/admin"
        />
      ) : isLoading ? (
        <SkeletonLines count={5} />
      ) : tenants.length === 0 ? (
        <EmptyState
          kind={q || status ? "empty_filtered" : "shops"}
          title={q || status ? "No shops match" : undefined}
          description={
            q || status
              ? "Try a different search or status filter."
              : undefined
          }
        />
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-border bg-card shadow-sm">
          <table className="w-full min-w-[48rem] text-left text-sm">
            <thead className="border-b border-border bg-muted/30 text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-medium">Shop</th>
                <th className="px-4 py-3 font-medium">Owner</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Verified</th>
                <th className="px-4 py-3 font-medium">Plan</th>
                <th className="px-4 py-3 font-medium">Created</th>
                <th className="px-4 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {tenants.map((t) => (
                <tr key={t.id} className="hover:bg-muted/20">
                  <td className="px-4 py-3">
                    <Link
                      href={`/admin/tenants/${t.id}`}
                      className="font-medium hover:text-accent"
                    >
                      {t.name}
                    </Link>
                    <p className="text-xs text-muted-foreground">{t.slug}</p>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {t.ownerEmail}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-sm px-2 py-0.5 text-xs capitalize ${statusClass(t.status)}`}
                    >
                      {t.status.replace(/_/g, " ")}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <TrustBadge verified={t.verifiedBadge} />
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {t.plan?.name ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {new Date(t.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
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
