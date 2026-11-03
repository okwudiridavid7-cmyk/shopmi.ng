import { z } from "zod";
import { tenantOffersPickup } from "./serialize";

export const checkoutDeliveryBody = z.object({
  fulfillmentMethod: z.enum(["delivery", "pickup"]),
  buyerPhone: z.string().trim().min(7).max(30),
  deliveryName: z.string().trim().min(2).max(120),
  deliveryAddress: z.string().trim().max(500).optional().nullable(),
  deliveryCity: z.string().trim().max(120).optional().nullable(),
  deliveryState: z.string().trim().max(120).optional().nullable(),
  deliveryCountry: z.string().trim().max(2).optional().nullable(),
  deliveryNote: z.string().trim().max(500).optional().nullable(),
});

export type CheckoutDelivery = z.infer<typeof checkoutDeliveryBody>;

/**
 * Validates checkout delivery/pickup against the shop's onboarding answers.
 * Returns normalized fields ready to persist on Order, or an error message.
 */
export function resolveCheckoutDelivery(
  raw: unknown,
  onboardingAnswers: unknown
): { ok: true; delivery: CheckoutDelivery } | { ok: false; error: string } {
  let delivery: CheckoutDelivery;
  try {
    delivery = checkoutDeliveryBody.parse(raw ?? {});
  } catch (err) {
    if (err instanceof z.ZodError) {
      return {
        ok: false,
        error: err.issues[0]?.message ?? "Check your delivery details",
      };
    }
    throw err;
  }

  const pickupOk = tenantOffersPickup(onboardingAnswers);
  if (delivery.fulfillmentMethod === "pickup" && !pickupOk) {
    return {
      ok: false,
      error: "This shop does not offer pickup. Enter a delivery address.",
    };
  }
  if (delivery.fulfillmentMethod === "delivery") {
    if (!delivery.deliveryAddress?.trim() || !delivery.deliveryCity?.trim()) {
      return {
        ok: false,
        error: "Street address and city are required for delivery.",
      };
    }
  }

  return { ok: true, delivery };
}

/** Map validated delivery into Order create/update fields. */
export function orderDeliveryFields(delivery: CheckoutDelivery) {
  const isDelivery = delivery.fulfillmentMethod === "delivery";
  return {
    fulfillmentMethod: delivery.fulfillmentMethod,
    buyerPhone: delivery.buyerPhone,
    deliveryName: delivery.deliveryName,
    deliveryAddress: isDelivery ? delivery.deliveryAddress?.trim() || null : null,
    deliveryCity: isDelivery ? delivery.deliveryCity?.trim() || null : null,
    deliveryState: isDelivery ? delivery.deliveryState?.trim() || null : null,
    deliveryCountry: isDelivery
      ? delivery.deliveryCountry?.trim().toUpperCase() || "NG"
      : null,
    deliveryNote: delivery.deliveryNote?.trim() || null,
  };
}
