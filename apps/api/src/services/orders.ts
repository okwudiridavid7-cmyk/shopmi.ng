import PDFDocument from "pdfkit";
import { env } from "../config/env";
import { prisma } from "../db/prisma";
import { decimalToNumber } from "../lib/serialize";
import { escapeHtml } from "../lib/htmlEscape";
import { enqueueTransactionalMail } from "../queue/transactionalMail";
import { getOrderEventsQueue, type OrderEventPayload } from "../queue/connection";
import { enqueueWhatsApp } from "../queue/whatsappWorker";
import { alertAdmins } from "./adminAlerts";
import {
  PaystackError,
  paystackConfigured,
  refundTransaction,
  toMinorUnits,
  verifyTransaction,
  type PaystackCharge,
} from "./paystack";

/**
 * Invoices are rendered on demand for an authorised viewer, so no PDF is ever
 * stored where it could be fetched by URL.
 */
export async function renderInvoicePdf(orderId: string): Promise<Buffer | null> {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      items: { include: { product: true } },
      buyer: true,
      tenant: true,
    },
  });
  if (!order) return null;

  return new Promise<Buffer>((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50 });
    const chunks: Buffer[] = [];
    doc.on("data", (c: Buffer) => chunks.push(c));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    doc.fontSize(20).text("Invoice", { align: "left" });
    doc.moveDown();
    doc.fontSize(10).fillColor("#444");
    doc.text(`Order: ${order.id}`);
    doc.text(`Reference: ${order.paystackReference ?? "-"}`);
    doc.text(`Date: ${order.createdAt.toISOString()}`);
    doc.text(`Shop: ${order.tenant.name}`);
    doc.text(`Buyer: ${order.buyer.email}`);
    doc.moveDown();

    doc.fillColor("#000").fontSize(12).text("Items");
    doc.moveDown(0.5);
    for (const item of order.items) {
      const lineTotal = decimalToNumber(item.unitPrice) * item.qty;
      doc
        .fontSize(10)
        .text(
          `${item.product.title} × ${item.qty} @ ${order.currency} ${decimalToNumber(item.unitPrice).toFixed(2)} = ${order.currency} ${lineTotal.toFixed(2)}`
        );
    }
    doc.moveDown();
    doc
      .fontSize(12)
      .text(
        `Total: ${order.currency} ${decimalToNumber(order.total).toFixed(2)}`,
        { underline: true }
      );

    doc.end();
  });
}

async function markInvoiceReady(orderId: string): Promise<void> {
  await prisma.order.updateMany({
    where: { id: orderId },
    data: { invoiceUrl: `${env.apiUrl}/api/orders/${orderId}/invoice` },
  });
}

export async function sendOrderConfirmationEmail(orderId: string): Promise<void> {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      items: { include: { product: true } },
      buyer: true,
      tenant: { include: { owner: true } },
    },
  });
  if (!order) return;

  const prefs =
    (order.buyer.notificationPrefs as { orderEmails?: boolean } | null) ?? {};
  if (prefs.orderEmails === false) return;

  const itemsHtml = `<table style="width:100%;border-collapse:collapse;font-size:14px;">
    <thead><tr>
      <th align="left" style="padding:6px 0;border-bottom:1px solid #e5e7eb;">Item</th>
      <th align="left" style="padding:6px 0;border-bottom:1px solid #e5e7eb;">Qty</th>
      <th align="right" style="padding:6px 0;border-bottom:1px solid #e5e7eb;">Price</th>
    </tr></thead>
    <tbody>${order.items
      .map((item) => {
        const title = escapeHtml(item.product.title);
        const price = decimalToNumber(item.unitPrice).toFixed(2);
        return `<tr>
          <td style="padding:6px 0;border-bottom:1px solid #f3f4f6;">${title}</td>
          <td style="padding:6px 0;border-bottom:1px solid #f3f4f6;">${item.qty}</td>
          <td align="right" style="padding:6px 0;border-bottom:1px solid #f3f4f6;">${escapeHtml(order.currency)} ${price}</td>
        </tr>`;
      })
      .join("")}</tbody></table>`;

  const totalLabel = `${order.currency} ${decimalToNumber(order.total).toFixed(2)}`;
  const orderUrl = `${env.webUrl}/buyer/orders/${order.id}`;

  await enqueueTransactionalMail({
    kind: "order_buyer",
    to: order.buyer.email,
    data: {
      name: order.buyer.name,
      shopName: order.tenant.name,
      totalLabel,
      reference: order.paystackReference,
      orderId: order.id,
      itemsHtml,
      orderUrl,
    },
    idempotencyKey: `order-buyer:${order.id}`,
  });

  const sellerEmail = order.tenant.owner.email;
  if (sellerEmail) {
    await enqueueTransactionalMail({
      kind: "order_seller",
      to: sellerEmail,
      data: {
        name: order.tenant.owner.name,
        totalLabel,
        buyerEmail: order.buyer.email,
        itemsHtml,
        ordersUrl: `${env.webUrl}/seller/orders/${order.id}`,
      },
      idempotencyKey: `order-seller:${order.id}`,
    });
  }
}

export type ChargeOutcome = "fulfilled" | "already" | "unknown" | "ignored" | "flagged" | "refunding";

const orderEmailInclude = {
  items: true,
} as const;

async function enqueueOrderEvent(payload: OrderEventPayload): Promise<void> {
  try {
    await getOrderEventsQueue().add(payload.kind, payload, {
      jobId: `order-${payload.kind}-${payload.orderId}`,
    });
  } catch (err) {
    console.warn(
      `[orders] queue unavailable, running ${payload.kind} side effects inline:`,
      err instanceof Error ? err.message : err
    );
    await runOrderEvent(payload).catch((e) =>
      console.error("[orders] inline side effects failed:", e instanceof Error ? e.message : e)
    );
  }
}

/** Worker handler: everything a buyer or seller should hear about after a state change. */
export async function runOrderEvent(payload: OrderEventPayload): Promise<void> {
  if (payload.kind === "paid") {
    await markInvoiceReady(payload.orderId);
    await sendOrderConfirmationEmail(payload.orderId);
    await enqueueWhatsApp({ kind: "new_order", orderId: payload.orderId }).catch((err) =>
      console.error("[orders] WhatsApp enqueue failed:", err instanceof Error ? err.message : err)
    );
    return;
  }
  if (payload.kind === "refunded") {
    await sendRefundEmail(payload.orderId);
  }
}

/**
 * Applies a verified Paystack charge to its order. Safe to call any number of times
 * from the webhook, the callback page and the expiry sweep: the status claim is atomic,
 * so stock, ledger and notifications happen exactly once.
 */
export async function applyOrderCharge(charge: PaystackCharge): Promise<ChargeOutcome> {
  const order = await prisma.order.findUnique({
    where: { paystackReference: charge.reference },
    include: orderEmailInclude,
  });
  if (!order) return "unknown";
  if (charge.status !== "success") return "ignored";
  if (order.status === "paid" || order.status === "fulfilled") return "already";

  const expected = toMinorUnits(decimalToNumber(order.total));
  if (charge.amount !== expected || charge.currency !== order.currency.toUpperCase()) {
    const flagged = await prisma.order.updateMany({
      where: { id: order.id, flag: null },
      data: { flag: "amount_mismatch" },
    });
    if (flagged.count) {
      await alertAdmins({
        title: "Payment amount mismatch",
        lines: [
          `Order ${order.id} (${charge.reference}) expected ${order.currency} ${expected / 100}.`,
          `Paystack reported ${charge.currency} ${charge.amount / 100}. The order was not fulfilled.`,
          "Check the transaction in Paystack and refund it if needed.",
        ],
        idempotencyKey: `alert-mismatch:${order.id}`,
      });
    }
    return "flagged";
  }

  if (order.status === "cancelled") {
    // Paid after the seller cancelled the unpaid order: give the money back.
    const claimed = await prisma.order.updateMany({
      where: { id: order.id, status: "cancelled", refundStatus: null },
      data: { refundStatus: "pending", flag: "paid_after_cancel", paidAt: new Date() },
    });
    if (claimed.count) await startRefund(order.id, charge.reference, "Order was cancelled before payment");
    return "refunding";
  }

  const fulfilled = await prisma.$transaction(async (tx) => {
    const claimed = await tx.order.updateMany({
      where: { id: order.id, status: { in: ["pending_payment", "failed"] } },
      data: { status: "paid", paidAt: new Date(), failureReason: null },
    });
    if (!claimed.count) return false;

    let oversold = false;
    for (const item of order.items) {
      const dec = await tx.product.updateMany({
        where: { id: item.productId, stockQty: { gte: item.qty } },
        data: { stockQty: { decrement: item.qty } },
      });
      if (!dec.count) {
        oversold = true;
        await tx.product.updateMany({ where: { id: item.productId }, data: { stockQty: 0 } });
      }
    }
    if (oversold) {
      await tx.order.update({ where: { id: order.id }, data: { flag: "oversold" } });
    }

    const cart = await tx.cart.findUnique({
      where: { tenantId_userId: { tenantId: order.tenantId, userId: order.buyerId } },
      select: { id: true },
    });
    if (cart) {
      await tx.cartItem.deleteMany({
        where: { cartId: cart.id, productId: { in: order.items.map((i) => i.productId) } },
      });
    }

    if (!order.splitSubaccount) {
      const share = decimalToNumber(order.total) - decimalToNumber(order.serviceFee ?? 0);
      await tx.sellerLedgerEntry.createMany({
        data: [
          {
            tenantId: order.tenantId,
            orderId: order.id,
            kind: "sale",
            amount: Math.max(0, Math.round(share * 100) / 100),
            currency: order.currency,
          },
        ],
        skipDuplicates: true,
      });
    }
    return true;
  });

  if (!fulfilled) return "already";
  await enqueueOrderEvent({ kind: "paid", orderId: order.id });
  const after = await prisma.order.findUnique({ where: { id: order.id }, select: { flag: true } });
  if (after?.flag === "oversold") {
    await alertAdmins({
      title: "Order paid but stock ran out",
      lines: [
        `Order ${order.id} (${charge.reference}) was paid after an item sold out.`,
        "The seller should restock or cancel the order, which refunds the buyer.",
      ],
      idempotencyKey: `alert-oversold:${order.id}`,
    });
  }
  return "fulfilled";
}

/** A declined attempt. Paystack lets the buyer retry on the same reference, so this is not final. */
export async function applyOrderChargeFailed(reference: string): Promise<void> {
  await prisma.order.updateMany({
    where: { paystackReference: reference, status: "pending_payment" },
    data: { status: "failed", failureReason: "declined" },
  });
}

/** Asks Paystack for the refund. The order must already be claimed with refundStatus "pending". */
async function startRefund(orderId: string, reference: string, reason: string): Promise<boolean> {
  try {
    await refundTransaction(reference, { reason });
    return true;
  } catch (err) {
    await prisma.order.update({ where: { id: orderId }, data: { refundStatus: "failed" } });
    await alertAdmins({
      title: "Refund could not be started",
      lines: [
        `Order ${orderId} (${reference}): ${err instanceof Error ? err.message : "unknown error"}.`,
        "Refund it from the Paystack dashboard.",
      ],
      idempotencyKey: `alert-refund-start:${orderId}`,
    });
    return false;
  }
}

export class RefundError extends Error {
  constructor(
    message: string,
    readonly status: number
  ) {
    super(message);
  }
}

/**
 * Seller cancels a paid order: refund through Paystack, put the stock back, reverse
 * the ledger, tell the buyer. If Paystack refuses, the order stays paid.
 */
export async function cancelPaidOrder(orderId: string, tenantId: string): Promise<void> {
  const order = await prisma.order.findFirst({
    where: { id: orderId, tenantId },
    include: { items: true },
  });
  if (!order) throw new RefundError("Order not found", 404);
  if (!order.paystackReference) throw new RefundError("This order has no payment to refund", 400);

  const claimed = await prisma.order.updateMany({
    where: { id: order.id, status: "paid", refundStatus: null },
    data: { status: "cancelled", refundStatus: "pending" },
  });
  if (!claimed.count) throw new RefundError("This order can no longer be cancelled", 409);

  try {
    await refundTransaction(order.paystackReference, { reason: "Cancelled by seller" });
  } catch (err) {
    await prisma.order.update({
      where: { id: order.id },
      data: { status: "paid", refundStatus: null },
    });
    const message = err instanceof PaystackError ? err.message : "Refund failed";
    throw new RefundError(`Paystack could not refund this order: ${message}`, 502);
  }

  await prisma.$transaction(async (tx) => {
    for (const item of order.items) {
      await tx.product.updateMany({
        where: { id: item.productId },
        data: { stockQty: { increment: item.qty } },
      });
    }
    const sale = await tx.sellerLedgerEntry.findUnique({
      where: { orderId_kind: { orderId: order.id, kind: "sale" } },
    });
    if (sale) {
      await tx.sellerLedgerEntry.createMany({
        data: [
          {
            tenantId: order.tenantId,
            orderId: order.id,
            kind: "refund",
            amount: sale.amount.negated(),
            currency: sale.currency,
          },
        ],
        skipDuplicates: true,
      });
    }
  });
  await enqueueOrderEvent({ kind: "refunded", orderId: order.id });
}

/** refund.processed / refund.failed webhooks. */
export async function applyRefundEvent(reference: string, status: "processed" | "failed"): Promise<void> {
  const order = await prisma.order.findUnique({
    where: { paystackReference: reference },
    select: { id: true, refundStatus: true },
  });
  if (!order || order.refundStatus === status) return;
  await prisma.order.update({
    where: { id: order.id },
    data: { refundStatus: status, ...(status === "processed" ? { refundedAt: new Date() } : {}) },
  });
  if (status === "failed") {
    await alertAdmins({
      title: "Refund failed",
      lines: [`Paystack could not complete the refund for order ${order.id} (${reference}).`],
      idempotencyKey: `alert-refund-failed:${order.id}`,
    });
  }
}

const PENDING_TTL_MS = 60 * 60 * 1000;

/**
 * Closes checkouts abandoned for over an hour. Each one is checked with Paystack
 * first, so a payment whose webhook got lost is fulfilled instead of expired.
 */
export async function expireStaleOrders(): Promise<{ expired: number; recovered: number }> {
  const stale = await prisma.order.findMany({
    where: { status: "pending_payment", createdAt: { lt: new Date(Date.now() - PENDING_TTL_MS) } },
    select: { id: true, paystackReference: true },
    orderBy: { createdAt: "asc" },
    take: 50,
  });
  let expired = 0;
  let recovered = 0;
  for (const o of stale) {
    if (o.paystackReference && paystackConfigured()) {
      try {
        const charge = await verifyTransaction(o.paystackReference);
        if (charge?.status === "success") {
          if ((await applyOrderCharge(charge)) === "fulfilled") recovered += 1;
          continue;
        }
        if (charge && ["ongoing", "pending", "processing", "queued"].includes(charge.status)) continue;
      } catch (err) {
        // "Transaction reference not found" means checkout was never opened.
        if (!(err instanceof PaystackError) || err.status !== 400) continue;
      }
    }
    const res = await prisma.order.updateMany({
      where: { id: o.id, status: "pending_payment" },
      data: { status: "failed", failureReason: "expired" },
    });
    expired += res.count;
  }
  return { expired, recovered };
}

async function sendRefundEmail(orderId: string): Promise<void> {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { buyer: true, tenant: true },
  });
  if (!order) return;
  await enqueueTransactionalMail({
    kind: "order_refunded",
    to: order.buyer.email,
    data: {
      name: order.buyer.name,
      shopName: order.tenant.name,
      totalLabel: `${order.currency} ${decimalToNumber(order.total).toFixed(2)}`,
      reference: order.paystackReference,
      orderId: order.id,
      orderUrl: `${env.webUrl}/buyer/orders/${order.id}`,
    },
    idempotencyKey: `order-refund:${order.id}`,
  });
}
