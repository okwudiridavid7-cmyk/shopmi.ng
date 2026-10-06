import { prisma } from "../db/prisma";
import { env } from "../config/env";
import { decimalToNumber } from "../lib/serialize";
import { activatePlan, termPrice, type BillingMonths } from "../lib/plans";
import { alertAdmins } from "./adminAlerts";
import {
  PaystackError,
  initializeTransaction,
  newReference,
  paystackConfigured,
  toMinorUnits,
  verifyTransaction,
  type PaystackCharge,
} from "./paystack";

export const PLAN_PAYMENT_PREFIX = "pln_";

export class PlanBillingError extends Error {
  constructor(
    message: string,
    readonly status: number
  ) {
    super(message);
  }
}

/** Creates the payment row and the Paystack checkout. The price always comes from the database. */
export async function startPlanCheckout(opts: {
  tenantId: string;
  planId: string;
  months: BillingMonths;
  userId: string;
  email: string;
}): Promise<{ authorizationUrl: string; reference: string }> {
  if (!paystackConfigured()) throw new PlanBillingError("Payments are not available right now", 503);
  const plan = await prisma.plan.findFirst({ where: { id: opts.planId, active: true } });
  if (!plan) throw new PlanBillingError("Plan not found", 404);
  const monthly = decimalToNumber(plan.price);
  if (monthly <= 0) throw new PlanBillingError("This plan is free", 400);

  const amount = termPrice(monthly, opts.months);
  const reference = newReference(PLAN_PAYMENT_PREFIX);
  await prisma.planPayment.create({
    data: {
      tenantId: opts.tenantId,
      planId: plan.id,
      months: opts.months,
      amount,
      currency: plan.currency,
      reference,
      createdById: opts.userId,
    },
  });

  try {
    const init = await initializeTransaction({
      email: opts.email,
      amount: toMinorUnits(amount),
      currency: plan.currency,
      reference,
      callback_url: `${env.webUrl}/seller/plan/callback?reference=${reference}`,
      metadata: {
        kind: "plan",
        tenantId: opts.tenantId,
        planId: plan.id,
        months: opts.months,
        custom_fields: [
          { display_name: "Plan", variable_name: "plan", value: `${plan.name}, ${opts.months} month${opts.months === 1 ? "" : "s"}` },
        ],
      },
    });
    return { authorizationUrl: init.authorization_url, reference };
  } catch (err) {
    await prisma.planPayment.update({ where: { reference }, data: { status: "failed" } });
    console.error("[plans] Paystack initialize failed:", err instanceof Error ? err.message : err);
    throw new PlanBillingError("Could not start payment. Please try again.", 502);
  }
}

/** Webhook / callback / sweep. The claim is atomic, so a term is only ever added once. */
export async function applyPlanCharge(charge: PaystackCharge): Promise<"activated" | "already" | "unknown" | "ignored" | "flagged"> {
  const payment = await prisma.planPayment.findUnique({ where: { reference: charge.reference } });
  if (!payment) return "unknown";
  if (charge.status !== "success") return "ignored";
  if (payment.status === "paid") return "already";

  const expected = toMinorUnits(decimalToNumber(payment.amount));
  if (charge.amount !== expected || charge.currency !== payment.currency.toUpperCase()) {
    await alertAdmins({
      title: "Plan payment amount mismatch",
      lines: [
        `Plan payment ${payment.reference} expected ${payment.currency} ${expected / 100}, Paystack reported ${charge.currency} ${charge.amount / 100}.`,
        "The plan was not activated. Check the transaction in Paystack.",
      ],
      idempotencyKey: `alert-plan-mismatch:${payment.id}`,
    });
    return "flagged";
  }

  const claimed = await prisma.planPayment.updateMany({
    where: { id: payment.id, status: { in: ["pending", "failed"] } },
    data: { status: "paid", paidAt: new Date() },
  });
  if (!claimed.count) return "already";
  await activatePlan(payment.tenantId, payment.planId, payment.months);
  return "activated";
}

/** Settles plan checkouts left open for over an hour, recovering any lost webhook. */
export async function expireStalePlanPayments(): Promise<number> {
  const stale = await prisma.planPayment.findMany({
    where: { status: "pending", createdAt: { lt: new Date(Date.now() - 60 * 60 * 1000) } },
    select: { id: true, reference: true },
    take: 50,
  });
  let closed = 0;
  for (const p of stale) {
    if (paystackConfigured()) {
      try {
        const charge = await verifyTransaction(p.reference);
        if (charge?.status === "success") {
          await applyPlanCharge(charge);
          continue;
        }
        if (charge && ["ongoing", "pending", "processing", "queued"].includes(charge.status)) continue;
      } catch (err) {
        if (!(err instanceof PaystackError) || err.status !== 400) continue;
      }
    }
    const res = await prisma.planPayment.updateMany({
      where: { id: p.id, status: "pending" },
      data: { status: "failed" },
    });
    closed += res.count;
  }
  return closed;
}
