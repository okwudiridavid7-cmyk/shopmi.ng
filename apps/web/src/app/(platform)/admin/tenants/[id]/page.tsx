"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import { Store } from "lucide-react";
import { PageHeader } from "@/components/dashboard/page-header";
import { EmptyState, QueryErrorState } from "@/components/empty-state";
import { SkeletonLines } from "@/components/skeleton";
import { TrustBadge } from "@/components/shell/trust-badge";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Modal } from "@/components/ui/modal";
import { formatMoney } from "@/lib/api";
import { useAdminTenant, usePatchTenant } from "@/hooks/use-admin";

export default function AdminTenantDetailPage() {
  const params = useParams();
  const id = typeof params.id === "string" ? params.id : "";
  const { data: tenant, isLoading, error, refetch } = useAdminTenant(id);
  const patch = usePatchTenant();
  const [suspendOpen, setSuspendOpen] = useState(false);

  if (isLoading) return <SkeletonLines count={5} />;
  if (error) {
    return (
      <QueryErrorState
        error={error}
        onRetry={() => {
          void refetch();
        }}
        sellerHomeHref="/admin/tenants"
      />
    );
  }
  if (!tenant) {
    return (
      <EmptyState
        kind="not_found"
        title="Shop not found"
        description="This shop may have been removed."
        actionLabel="Back to shops"
        actionHref="/admin/tenants"
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <Link
          href="/admin/tenants"
          className="text-xs text-muted-foreground hover:text-foreground"
        >
          ← Shops
        </Link>
        <PageHeader
          title={tenant.name}
          description={`/shops/${tenant.slug} · ${tenant.status.replace(/_/g, " ")}`}
          icon={Store}
          actions={
            <>
              <TrustBadge verified={tenant.verifiedBadge} />
              <Button
                variant="outline"
                size="sm"
                disabled={patch.isPending}
                onClick={() =>
                  patch.mutate({
                    id: tenant.id,
                    verifiedBadge: !tenant.verifiedBadge,
                  })
                }
              >
                {tenant.verifiedBadge
                  ? "Remove verified badge"
                  : "Mark verified"}
              </Button>
              {tenant.status === "suspended" ? (
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={patch.isPending}
                  onClick={() =>
                    patch.mutate({ id: tenant.id, status: "active" })
                  }
                >
                  Reactivate
                </Button>
              ) : (
                <Button
                  variant="danger"
                  size="sm"
                  onClick={() => setSuspendOpen(true)}
                >
                  Suspend
                </Button>
              )}
            </>
          }
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="overflow-hidden rounded-2xl">
          <CardHeader className="bg-muted/30">
            <p className="text-sm font-semibold text-foreground">Profile</p>
          </CardHeader>
          <CardBody className="space-y-2 text-sm">
            <p>
              <span className="text-muted-foreground">Location: </span>
              {tenant.location || "—"}
            </p>
            <p>
              <span className="text-muted-foreground">Plan: </span>
              {tenant.plan?.name ?? "—"}
            </p>
            <p>
              <span className="text-muted-foreground">Custom domain: </span>
              {tenant.customDomain || "—"}
            </p>
            <p>
              <span className="text-muted-foreground">Products: </span>
              {tenant.productCount}
            </p>
            <p>
              <span className="text-muted-foreground">Orders: </span>
              {tenant.orderCount} · GMV{" "}
              {formatMoney(tenant.salesTotal, tenant.currency)}
            </p>
            <p>
              <span className="text-muted-foreground">Created: </span>
              {new Date(tenant.createdAt).toLocaleString()}
            </p>
          </CardBody>
        </Card>

        <Card className="overflow-hidden rounded-2xl">
          <CardHeader className="bg-muted/30">
            <p className="text-sm font-semibold text-foreground">
              Owner contact
            </p>
          </CardHeader>
          <CardBody className="space-y-2 text-sm">
            <p>{tenant.owner.name || "—"}</p>
            <p>{tenant.owner.email}</p>
            <p>{tenant.owner.phone || "No phone"}</p>
            <p className="capitalize text-muted-foreground">
              Role: {tenant.owner.role}
            </p>
          </CardBody>
        </Card>
      </div>

      <Card className="overflow-hidden rounded-2xl">
        <CardHeader className="bg-muted/30">
          <p className="text-sm font-semibold text-foreground">Recent orders</p>
        </CardHeader>
        <CardBody>
          {tenant.recentOrders.length === 0 ? (
            <p className="text-sm text-muted-foreground">No orders yet.</p>
          ) : (
            <ul className="divide-y divide-border text-sm">
              {tenant.recentOrders.map((o) => (
                <li
                  key={o.id}
                  className="flex flex-wrap justify-between gap-2 py-2"
                >
                  <span>
                    {o.buyerName || o.buyerEmail} ·{" "}
                    <span className="capitalize">
                      {o.status.replace(/_/g, " ")}
                    </span>
                  </span>
                  <span className="text-muted-foreground">
                    {formatMoney(o.total, o.currency)} ·{" "}
                    {new Date(o.createdAt).toLocaleDateString()}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CardBody>
      </Card>

      <Card className="overflow-hidden rounded-2xl">
        <CardHeader className="bg-muted/30">
          <p className="text-sm font-semibold text-foreground">
            Verification documents
          </p>
        </CardHeader>
        <CardBody className="space-y-4">
          {tenant.verificationRequests.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No verification requests submitted.
            </p>
          ) : (
            tenant.verificationRequests.map((r) => (
              <div
                key={r.id}
                className="rounded-xl border border-border bg-muted/20 p-3 text-sm"
              >
                <p className="font-medium capitalize">
                  {r.status} · {new Date(r.createdAt).toLocaleString()}
                </p>
                {r.note && (
                  <p className="mt-1 text-muted-foreground">Note: {r.note}</p>
                )}
                <ul className="mt-2 space-y-1">
                  {r.submittedDocs.map((d) => (
                    <li key={d.url}>
                      <a
                        href={d.url}
                        target="_blank"
                        rel="noreferrer"
                        className="font-medium text-accent transition hover:text-accent-deep dark:text-accent-on-dark"
                      >
                        {d.name}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))
          )}
        </CardBody>
      </Card>

      <Modal
        open={suspendOpen}
        onClose={() => setSuspendOpen(false)}
        title="Suspend shop?"
        footer={
          <>
            <Button variant="ghost" onClick={() => setSuspendOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              disabled={patch.isPending}
              onClick={() =>
                patch.mutate(
                  { id: tenant.id, status: "suspended" },
                  { onSuccess: () => setSuspendOpen(false) }
                )
              }
            >
              Suspend
            </Button>
          </>
        }
      >
        <p>
          Suspend “{tenant.name}”? Checkout will be blocked for this shop until
          reactivated.
        </p>
      </Modal>
    </div>
  );
}
