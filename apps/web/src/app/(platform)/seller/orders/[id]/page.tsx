"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { ShoppingBag } from "lucide-react";
import { PageHeader } from "@/components/dashboard/page-header";
import { EmptyState, QueryErrorState } from "@/components/empty-state";
import { SkeletonLines } from "@/components/skeleton";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { formatMoney, productImageUrl } from "@/lib/api";
import { useSellerOrder, useUpdateOrderStatus } from "@/hooks/use-seller";

function statusLabel(status: string) {
  return status.replace(/_/g, " ");
}

export default function SellerOrderDetailPage() {
  const params = useParams();
  const id = typeof params.id === "string" ? params.id : "";
  const { data: order, error, isLoading, refetch } = useSellerOrder(id);
  const updateStatus = useUpdateOrderStatus();

  if (isLoading) {
    return <SkeletonLines count={4} />;
  }

  if (error) {
    return (
      <QueryErrorState
        error={error}
        onRetry={() => {
          void refetch();
        }}
        sellerHomeHref="/seller/orders"
      />
    );
  }

  if (!order) {
    return (
      <EmptyState
        kind="not_found"
        title="Order not found"
        description="This order may have been removed."
        actionLabel="Back to orders"
        actionHref="/seller/orders"
      />
    );
  }

  const buyer =
    order.buyer?.name?.trim() || order.buyer?.email || "Buyer";

  const nextActions: { status: "fulfilled" | "cancelled"; label: string }[] =
    [];
  if (order.status === "paid") {
    nextActions.push({ status: "fulfilled", label: "Mark fulfilled / shipped" });
    nextActions.push({ status: "cancelled", label: "Cancel order" });
  }
  if (order.status === "pending_payment") {
    nextActions.push({ status: "cancelled", label: "Cancel order" });
  }

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <Link
          href="/seller/orders"
          className="text-xs text-muted-foreground hover:text-foreground"
        >
          ← Orders
        </Link>
        <PageHeader
          title="Order details"
          description={`${buyer} · ${new Date(order.createdAt).toLocaleString()}`}
          icon={ShoppingBag}
          actions={
            <span className="rounded-lg bg-muted px-3 py-1.5 text-xs capitalize text-foreground">
              {statusLabel(order.status)}
            </span>
          }
        />
      </div>

      <Card className="overflow-hidden rounded-2xl">
        <CardHeader className="bg-muted/30">
          <p className="text-sm font-semibold text-foreground">Line items</p>
        </CardHeader>
        <CardBody className="space-y-4">
          <ul className="divide-y divide-border">
            {order.items.map((item) => {
              const img = item.product
                ? productImageUrl(item.product.images)
                : null;
              return (
                <li
                  key={item.id}
                  className="flex gap-3 py-3 first:pt-0 last:pb-0"
                >
                  <div className="h-16 w-16 shrink-0 overflow-hidden rounded-md bg-muted">
                    {img ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={img}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    ) : null}
                  </div>
                  <div className="min-w-0 flex-1 text-sm">
                    <p className="font-medium text-foreground">
                      {item.product?.title ?? "Product"}
                    </p>
                    <p className="text-muted-foreground">
                      Qty {item.qty} ·{" "}
                      {formatMoney(item.unitPrice, order.currency)} each
                    </p>
                  </div>
                </li>
              );
            })}
          </ul>
          <p className="border-t border-border pt-4 text-sm font-medium">
            Total {formatMoney(order.total, order.currency)}
          </p>
        </CardBody>
      </Card>

      {nextActions.length > 0 && (
        <Card className="overflow-hidden rounded-2xl">
          <CardHeader className="bg-muted/30">
            <p className="text-sm font-semibold text-foreground">
              Update status
            </p>
          </CardHeader>
          <CardBody className="flex flex-wrap gap-2">
            {nextActions.map((a) => (
              <Button
                key={a.status}
                variant={a.status === "cancelled" ? "danger" : "primary"}
                size="sm"
                disabled={updateStatus.isPending}
                onClick={() =>
                  updateStatus.mutate({ id: order.id, status: a.status })
                }
              >
                {a.label}
              </Button>
            ))}
            {updateStatus.isError && (
              <p className="w-full text-sm text-red-700 dark:text-red-400">
                {updateStatus.error instanceof Error
                  ? updateStatus.error.message
                  : "Update failed"}
              </p>
            )}
          </CardBody>
        </Card>
      )}
    </div>
  );
}
