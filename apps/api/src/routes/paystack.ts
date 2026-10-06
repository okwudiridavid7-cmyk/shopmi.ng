import { Router, raw } from "express";
import {
  applyOrderCharge,
  applyOrderChargeFailed,
  applyRefundEvent,
} from "../services/orders";
import { fulfillDomainPayment, PAYMENT_PREFIX } from "../services/domains";
import { chargeFromEvent, verifyPaystackSignature } from "../services/paystack";
import { applyPlanCharge, PLAN_PAYMENT_PREFIX } from "../services/planBilling";

export const paystackRouter = Router();

function refundReference(data: unknown): string | null {
  if (!data || typeof data !== "object") return null;
  const d = data as { transaction_reference?: unknown; transaction?: { reference?: unknown } };
  if (typeof d.transaction_reference === "string") return d.transaction_reference;
  if (typeof d.transaction?.reference === "string") return d.transaction.reference;
  return null;
}

/**
 * Paystack webhook. Only signed events are processed, and every handler re-checks
 * amount, currency and state, so a replayed or reordered event changes nothing.
 * Unknown references get a 200 so Paystack stops retrying them.
 */
paystackRouter.post("/webhook", raw({ type: "application/json", limit: "256kb" }), async (req, res) => {
  const signature = req.headers["x-paystack-signature"];
  const rawBody = Buffer.isBuffer(req.body) ? req.body : Buffer.alloc(0);
  if (!verifyPaystackSignature(rawBody, typeof signature === "string" ? signature : undefined)) {
    return res.status(401).json({ error: "Invalid signature" });
  }

  let event: { event?: unknown; data?: unknown };
  try {
    event = JSON.parse(rawBody.toString("utf8")) as typeof event;
  } catch {
    return res.sendStatus(200);
  }

  try {
    switch (event.event) {
      case "charge.success": {
        const charge = chargeFromEvent(event.data);
        if (!charge) break;
        if (charge.reference.startsWith(PAYMENT_PREFIX)) {
          await fulfillDomainPayment(charge.reference, charge.amount, charge.currency);
        } else if (charge.reference.startsWith(PLAN_PAYMENT_PREFIX)) {
          await applyPlanCharge(charge);
        } else {
          const outcome = await applyOrderCharge(charge);
          if (outcome === "unknown") console.warn(`[paystack] unknown reference ${charge.reference}`);
        }
        break;
      }
      case "charge.failed": {
        const charge = chargeFromEvent(event.data);
        if (charge && charge.reference.startsWith("ord_")) await applyOrderChargeFailed(charge.reference);
        break;
      }
      case "refund.processed":
      case "refund.failed": {
        const reference = refundReference(event.data);
        if (reference) {
          await applyRefundEvent(reference, event.event === "refund.processed" ? "processed" : "failed");
        }
        break;
      }
      default:
        break;
    }
    return res.sendStatus(200);
  } catch (err) {
    console.error("[paystack webhook]", err instanceof Error ? err.message : err);
    return res.status(500).json({ error: "Webhook handler failed" });
  }
});
