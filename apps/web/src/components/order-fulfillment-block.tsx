import type { OrderPublic } from "@vendors/shared-types";

/** Shared delivery / pickup / tracking summary for order detail pages. */
export function OrderFulfillmentBlock({ order }: { order: OrderPublic }) {
  const method = order.fulfillmentMethod;
  const hasDelivery =
    method === "delivery" ||
    Boolean(order.deliveryName || order.deliveryAddress);
  const hasTracking = Boolean(order.trackingNumber || order.trackingCarrier);

  if (!hasDelivery && !hasTracking && !order.buyerPhone) return null;

  return (
    <div className="space-y-2 text-sm">
      {method === "pickup" ? (
        <p>
          <span className="text-muted-foreground">Fulfillment: </span>
          <span className="font-medium text-foreground">Pickup</span>
          {order.deliveryName ? ` · ${order.deliveryName}` : ""}
          {order.buyerPhone ? ` · ${order.buyerPhone}` : ""}
        </p>
      ) : hasDelivery ? (
        <div>
          <p className="text-muted-foreground">Deliver to</p>
          <p className="font-medium text-foreground">
            {[order.deliveryName, order.buyerPhone].filter(Boolean).join(" · ")}
          </p>
          {order.deliveryAddress ? (
            <p className="text-foreground">{order.deliveryAddress}</p>
          ) : null}
          <p className="text-muted-foreground">
            {[order.deliveryCity, order.deliveryState, order.deliveryCountry]
              .filter(Boolean)
              .join(", ")}
          </p>
        </div>
      ) : order.buyerPhone ? (
        <p>
          <span className="text-muted-foreground">Phone: </span>
          <span className="font-medium text-foreground">{order.buyerPhone}</span>
        </p>
      ) : null}
      {order.deliveryNote ? (
        <p className="text-muted-foreground">Note: {order.deliveryNote}</p>
      ) : null}
      {hasTracking ? (
        <p>
          <span className="text-muted-foreground">Tracking: </span>
          <span className="font-medium text-foreground">
            {[order.trackingCarrier, order.trackingNumber].filter(Boolean).join(" · ")}
          </span>
        </p>
      ) : null}
    </div>
  );
}
