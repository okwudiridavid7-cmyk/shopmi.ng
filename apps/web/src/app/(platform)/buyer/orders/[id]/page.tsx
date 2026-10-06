"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { ShoppingBag } from "lucide-react";
import { PageHeader } from "@/components/dashboard/page-header";
import { EmptyState, QueryErrorState } from "@/components/empty-state";
import { SkeletonLines } from "@/components/skeleton";
import { TrustBadge } from "@/components/shell/trust-badge";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { apiUrl, formatMoney, productImageUrl } from "@/lib/api";
import { useBuyerOrder, type OrderShopContact } from "@/hooks/use-buyer";

function statusLabel(status: string) {
  return status.replace(/_/g, " ");
}

export default function BuyerOrderDetailPage() {
  const params = useParams();
  const id = typeof params.id === "string" ? params.id : "";
  const { data: order, error, isLoading, refetch } = useBuyerOrder(id);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <SkeletonLines count={4} />
      </div>
    );
  }

  if (error) {
    return (
      <QueryErrorState
        error={error}
        onRetry={() => {
          void refetch();
        }}
        sellerHomeHref="/buyer/orders"
      />
    );
  }

  if (!order) {
    return (
      <EmptyState
        kind="not_found"
        title="Order not found"
        actionLabel="Back to orders"
        actionHref="/buyer/orders"
      />
    );
  }

  const canInvoice =
    order.status === "paid" || order.status === "fulfilled";
  const refundNote =
    order.refundStatus === "processed"
      ? "This order was cancelled and your refund has been sent."
      : order.refundStatus
        ? "This order was cancelled. Your refund is being processed and usually arrives within 5 to 10 working days."
        : order.failureReason === "expired"
          ? "Payment was not completed in time, so this checkout closed. Your card was not charged."
          : null;

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <Link
          href="/buyer/orders"
          className="text-xs text-muted-foreground hover:text-foreground"
        >
          ← Orders
        </Link>
        <PageHeader
          title="Order details"
          description={`Placed ${new Date(order.createdAt).toLocaleString()}`}
          icon={ShoppingBag}
          actions={
            <span className="rounded-lg bg-muted px-3 py-1.5 text-xs capitalize text-foreground">
              {statusLabel(order.status)}
            </span>
          }
        />
      </div>

      {refundNote ? (
        <p className="rounded-xl border border-border bg-muted/40 px-4 py-3 text-sm text-foreground">
          {refundNote}
        </p>
      ) : null}

      <Card className="overflow-hidden rounded-2xl">
        <CardHeader className="bg-muted/30">
          <div className="flex flex-wrap items-center gap-2">
            {order.tenant && order.shopContact?.available !== false ? (
              <Link
                href={`/shops/${order.tenant.slug}`}
                className="text-sm font-semibold hover:text-accent"
              >
                {order.tenant.name}
              </Link>
            ) : order.tenant ? (
              <span className="text-sm font-semibold">{order.tenant.name}</span>
            ) : (
              <span className="text-sm font-semibold">Shop</span>
            )}
            {order.tenant && (
              <TrustBadge verified={!!order.tenant.verifiedBadge} />
            )}
          </div>
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

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4 text-sm">
            <div className="space-y-1">
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

      {order.shopContact ? <ShopContactCard contact={order.shopContact} /> : null}
    </div>
  );
}

function ShopContactCard({ contact }: { contact: OrderShopContact }) {
  const whatsappHref = contact.whatsappUrl
    ? contact.whatsappUrl.startsWith("http")
      ? contact.whatsappUrl
      : `https://wa.me/${contact.whatsappUrl.replace(/\D/g, "")}`
    : null;
  const hasAny = contact.email || contact.phone || whatsappHref;
  if (!hasAny && contact.available) return null;

  return (
    <Card className="overflow-hidden rounded-2xl">
      <CardHeader className="bg-muted">
        <p className="text-sm font-semibold text-foreground">Contact the seller</p>
      </CardHeader>
      <CardBody className="space-y-2 text-sm">
        {!contact.available ? (
          <p className="text-muted-foreground">
            This shop’s storefront is currently unavailable. Your order isn’t affected; the seller
            can still fulfil it.
          </p>
        ) : null}
        {contact.email ? (
          <p>
            <span className="text-muted-foreground">Email: </span>
            <a href={`mailto:${contact.email}`} className="font-medium hover:underline">
              {contact.email}
            </a>
          </p>
        ) : null}
        {contact.phone ? (
          <p>
            <span className="text-muted-foreground">Phone: </span>
            <a href={`tel:${contact.phone}`} className="font-medium hover:underline">
              {contact.phone}
            </a>
          </p>
        ) : null}
        {whatsappHref ? (
          <p>
            <a href={whatsappHref} target="_blank" rel="noreferrer" className="font-medium hover:underline">
              Chat on WhatsApp
            </a>
          </p>
        ) : null}
      </CardBody>
    </Card>
  );
}
