"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { EmptyState } from "@/components/empty-state";
import { SkeletonLines } from "@/components/skeleton";
import { TrustBadge } from "@/components/shell/trust-badge";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { apiUrl, formatMoney, productImageUrl } from "@/lib/api";
import { useBuyerOrder } from "@/hooks/use-buyer";

function statusLabel(status: string) {
  return status.replace(/_/g, " ");
}

export default function BuyerOrderDetailPage() {
  const params = useParams();
  const id = typeof params.id === "string" ? params.id : "";
  const { data: order, error, isLoading } = useBuyerOrder(id);

  if (isLoading) {
    return (
      <div className="space-y-token-4">
        <SkeletonLines count={4} />
      </div>
    );
  }

  if (error || !order) {
    return (
      <EmptyState
        title="Order not found"
        description={
          error instanceof Error
            ? error.message
            : "This order may have been removed or you don’t have access."
        }
        actionLabel="Back to orders"
        actionHref="/buyer/orders"
      />
    );
  }

  const canInvoice =
    order.status === "paid" || order.status === "fulfilled";

  return (
    <div className="space-y-token-6">
      <div className="flex flex-wrap items-start justify-between gap-token-3">
        <div className="space-y-token-2">
          <Link
            href="/buyer/orders"
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            ← Orders
          </Link>
          <h1 className="font-display text-2xl text-foreground">
            Order details
          </h1>
          <p className="text-sm text-muted-foreground">
            Placed {new Date(order.createdAt).toLocaleString()}
          </p>
        </div>
        <span className="rounded-sm bg-muted px-token-3 py-token-1 text-xs capitalize text-foreground">
          {statusLabel(order.status)}
        </span>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center gap-token-2">
            {order.tenant ? (
              <Link
                href={`/shops/${order.tenant.slug}`}
                className="font-medium hover:underline"
              >
                {order.tenant.name}
              </Link>
            ) : (
              <span className="font-medium">Shop</span>
            )}
            {order.tenant && (
              <TrustBadge verified={!!order.tenant.verifiedBadge} />
            )}
          </div>
        </CardHeader>
        <CardBody className="space-y-token-4">
          <ul className="divide-y divide-border">
            {order.items.map((item) => {
              const img = item.product
                ? productImageUrl(item.product.images)
                : null;
              return (
                <li
                  key={item.id}
                  className="flex gap-token-3 py-token-3 first:pt-0 last:pb-0"
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

          <div className="flex flex-wrap items-center justify-between gap-token-3 border-t border-border pt-token-4 text-sm">
            <div className="space-y-token-1">
              <p className="text-muted-foreground">
                Subtotal {formatMoney(order.subtotal, order.currency)}
              </p>
              <p className="font-medium text-foreground">
                Total {formatMoney(order.total, order.currency)}
              </p>
            </div>
            {canInvoice && (
              // TODO(Phase 1): invoice PDF is generated on payment verify.
              // Link hits the existing endpoint; UI shows toast/error if stub missing.
              <a href={apiUrl(`/api/orders/${order.id}/invoice`)}>
                <Button variant="outline" size="sm">
                  Download invoice
                </Button>
              </a>
            )}
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
