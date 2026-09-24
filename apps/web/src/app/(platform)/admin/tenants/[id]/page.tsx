"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { EmptyState } from "@/components/empty-state";
import { SkeletonLines } from "@/components/skeleton";
import { TrustBadge } from "@/components/shell/trust-badge";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Modal } from "@/components/ui/modal";
import { formatMoney } from "@/lib/api";
import { useAdminTenant, usePatchTenant } from "@/hooks/use-admin";
import { useState } from "react";

export default function AdminTenantDetailPage() {
  const params = useParams();
  const id = typeof params.id === "string" ? params.id : "";
  const { data: tenant, isLoading, error } = useAdminTenant(id);
  const patch = usePatchTenant();
  const [suspendOpen, setSuspendOpen] = useState(false);

  if (isLoading) return <SkeletonLines count={5} />;
  if (error || !tenant) {
    return (
      <EmptyState
        title="Shop not found"
        description={
          error instanceof Error ? error.message : "This shop may have been removed."
        }
        actionLabel="Back to shops"
        actionHref="/admin/tenants"
      />
    );
  }

  return (
    <div className="space-y-token-6">
      <div className="flex flex-wrap items-start justify-between gap-token-3">
        <div className="space-y-token-2">
          <Link
            href="/admin/tenants"
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            ← Shops
          </Link>
          <div className="flex flex-wrap items-center gap-token-2">
            <h1 className="font-display text-2xl text-foreground">
              {tenant.name}
            </h1>
            <TrustBadge verified={tenant.verifiedBadge} />
          </div>
          <p className="text-sm text-muted-foreground">
            /shops/{tenant.slug} ·{" "}
            <span className="capitalize">
              {tenant.status.replace(/_/g, " ")}
            </span>
          </p>
        </div>
        <div className="flex flex-wrap gap-token-2">
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
            {tenant.verifiedBadge ? "Remove verified badge" : "Mark verified"}
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
        </div>
      </div>

      <div className="grid gap-token-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <p className="text-sm font-medium">Profile</p>
          </CardHeader>
          <CardBody className="space-y-token-2 text-sm">
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

        <Card>
          <CardHeader>
            <p className="text-sm font-medium">Owner contact</p>
          </CardHeader>
          <CardBody className="space-y-token-2 text-sm">
            <p>{tenant.owner.name || "—"}</p>
            <p>{tenant.owner.email}</p>
            <p>{tenant.owner.phone || "No phone"}</p>
            <p className="capitalize text-muted-foreground">
              Role: {tenant.owner.role}
            </p>
          </CardBody>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <p className="text-sm font-medium">Recent orders</p>
        </CardHeader>
        <CardBody>
          {tenant.recentOrders.length === 0 ? (
            <p className="text-sm text-muted-foreground">No orders yet.</p>
          ) : (
            <ul className="divide-y divide-border text-sm">
              {tenant.recentOrders.map((o) => (
                <li
                  key={o.id}
                  className="flex flex-wrap justify-between gap-token-2 py-token-2"
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

      <Card>
        <CardHeader>
          <p className="text-sm font-medium">Verification documents</p>
        </CardHeader>
        <CardBody className="space-y-token-4">
          {tenant.verificationRequests.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No verification requests submitted.
            </p>
          ) : (
            tenant.verificationRequests.map((r) => (
              <div
                key={r.id}
                className="rounded-md border border-border p-token-3 text-sm"
              >
                <p className="capitalize font-medium">
                  {r.status} · {new Date(r.createdAt).toLocaleString()}
                </p>
                {r.note && (
                  <p className="mt-token-1 text-muted-foreground">Note: {r.note}</p>
                )}
                <ul className="mt-token-2 space-y-token-1">
                  {r.submittedDocs.map((d) => (
                    <li key={d.url}>
                      <a
                        href={d.url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-accent underline"
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
