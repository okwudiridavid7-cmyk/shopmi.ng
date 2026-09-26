import crypto from "crypto";
import fs from "fs";
import path from "path";
import PDFDocument from "pdfkit";
import { env } from "../config/env";
import { prisma } from "../db/prisma";
import { decimalToNumber } from "../lib/serialize";
import { escapeHtml } from "../lib/htmlEscape";
import { enqueueTransactionalMail } from "../queue/transactionalMail";

const invoicesDir = path.join(env.uploadsDir, "invoices");
fs.mkdirSync(invoicesDir, { recursive: true });

export async function generateInvoicePdf(orderId: string): Promise<string> {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      items: { include: { product: true } },
      buyer: true,
      tenant: true,
    },
  });
  if (!order) {
    throw new Error("Order not found");
  }

  const filename = `invoice-${order.id}.pdf`;
  const filepath = path.join(invoicesDir, filename);

  await new Promise<void>((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50 });
    const stream = fs.createWriteStream(filepath);
    doc.pipe(stream);

    doc.fontSize(20).text("Invoice", { align: "left" });
    doc.moveDown();
    doc.fontSize(10).fillColor("#444");
    doc.text(`Order: ${order.id}`);
    doc.text(`Reference: ${order.paystackReference ?? "—"}`);
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
    stream.on("finish", () => resolve());
    stream.on("error", reject);
  });

  const invoiceUrl = `${env.apiUrl}/api/orders/${order.id}/invoice`;
  await prisma.order.update({
    where: { id: order.id },
    data: { invoiceUrl },
  });

  return filepath;
}

export function getInvoiceFilePath(orderId: string): string {
  return path.join(invoicesDir, `invoice-${orderId}.pdf`);
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

/** Mark order paid (idempotent), decrement stock, invoice + email. */
export async function fulfillPaidOrder(paystackReference: string): Promise<void> {
  const order = await prisma.order.findUnique({
    where: { paystackReference },
    include: { items: true },
  });
  if (!order) {
    throw new Error(`Order not found for reference ${paystackReference}`);
  }
  if (order.status === "paid" || order.status === "fulfilled") {
    return;
  }

  await prisma.$transaction(async (tx) => {
    await tx.order.update({
      where: { id: order.id },
      data: { status: "paid" },
    });

    for (const item of order.items) {
      await tx.product.update({
        where: { id: item.productId },
        data: { stockQty: { decrement: item.qty } },
      });
    }

    // Clear cart for this buyer+tenant
    const cart = await tx.cart.findUnique({
      where: {
        tenantId_userId: { tenantId: order.tenantId, userId: order.buyerId },
      },
    });
    if (cart) {
      await tx.cartItem.deleteMany({ where: { cartId: cart.id } });
    }
  });

  await generateInvoicePdf(order.id);
  await sendOrderConfirmationEmail(order.id);
  await notifySellerWhatsApp(order.id);
}

async function notifySellerWhatsApp(orderId: string): Promise<void> {
  const { sendWhatsAppText } = await import("./whatsapp");
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      tenant: { include: { owner: true } },
      items: { include: { product: { select: { title: true } } } },
    },
  });
  if (!order) return;

  const settings =
    (order.tenant.notificationSettings as {
      whatsappOrdersEnabled?: boolean;
    } | null) ?? {};
  if (!settings.whatsappOrdersEnabled) return;

  const to =
    order.tenant.owner.whatsappNumber || order.tenant.owner.phone || null;
  if (!to) return;

  const lines = order.items
    .map((i) => `${i.qty}× ${i.product?.title ?? "item"}`)
    .join(", ");
  const body = `New order on ${order.tenant.name}: ${order.currency} ${Number(order.total).toFixed(2)}. ${lines}. Ref ${order.paystackReference ?? order.id}`;
  await sendWhatsAppText(to, body);
}

export function verifyPaystackSignature(
  rawBody: Buffer,
  signature: string | undefined
): boolean {
  if (!env.paystackSecretKey || !signature) return false;
  const hash = crypto
    .createHmac("sha512", env.paystackSecretKey)
    .update(rawBody)
    .digest("hex");
  return hash === signature;
}
