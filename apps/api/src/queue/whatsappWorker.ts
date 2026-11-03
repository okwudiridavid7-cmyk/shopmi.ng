import { Queue, Worker, type Job } from "bullmq";
import { prisma } from "../db/prisma";
import { planAllows } from "../lib/plans";
import {
  sendNewOrderTemplate,
  sendOrderUpdateTemplate,
  sendReminderTemplate,
} from "../services/whatsapp";
import { getRedisConnection, QUEUE_WHATSAPP } from "./connection";

export type WhatsAppJobPayload =
  | { kind: "new_order"; orderId: string }
  | { kind: "order_update"; orderId: string; status: "paid" | "fulfilled" | "refunded" }
  | {
      kind: "reminder";
      userId: string;
      title: string;
      body: string;
      actionHint: string;
      idempotencyKey?: string;
    };

let queue: Queue<WhatsAppJobPayload> | null = null;

export function getWhatsAppQueue(): Queue<WhatsAppJobPayload> {
  if (!queue) {
    queue = new Queue<WhatsAppJobPayload>(QUEUE_WHATSAPP, {
      connection: getRedisConnection(),
      defaultJobOptions: {
        removeOnComplete: 200,
        removeOnFail: 200,
        attempts: 5,
        backoff: { type: "exponential", delay: 15_000 },
      },
    });
  }
  return queue;
}

export async function enqueueWhatsApp(payload: WhatsAppJobPayload): Promise<void> {
  let jobId: string | undefined;
  if (payload.kind === "new_order") jobId = `wa-new-order-${payload.orderId}`;
  else if (payload.kind === "order_update") {
    jobId = `wa-order-${payload.status}-${payload.orderId}`;
  } else if (payload.kind === "reminder" && payload.idempotencyKey) {
    jobId = `wa-reminder-${payload.idempotencyKey}`;
  }
  await getWhatsAppQueue().add(payload.kind, payload, jobId ? { jobId } : undefined);
}

function buyerWantsWhatsApp(prefs: unknown): boolean {
  const p = prefs as { whatsappOrders?: boolean } | null;
  return !!p?.whatsappOrders;
}

function recipientNumber(user: {
  phoneVerifiedAt: Date | null;
  whatsappNumber: string | null;
  phone: string | null;
}): string | null {
  if (!user.phoneVerifiedAt) return null;
  return user.whatsappNumber || user.phone || null;
}

async function handleNewOrder(orderId: string): Promise<void> {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      tenant: { include: { owner: true } },
      items: { include: { product: { select: { title: true } } } },
    },
  });
  if (!order) return;

  if (!(await planAllows(order.tenantId, "whatsapp"))) return;

  const settings =
    (order.tenant.notificationSettings as { whatsappOrdersEnabled?: boolean } | null) ?? {};
  if (!settings.whatsappOrdersEnabled) return;

  const owner = order.tenant.owner;
  const to =
    (owner.phoneVerifiedAt && (owner.whatsappNumber || owner.phone)) ||
    owner.whatsappNumber ||
    owner.phone ||
    null;
  if (!to) return;

  const itemsSummary = order.items
    .map((i) => `${i.qty}× ${i.product?.title ?? "item"}`)
    .join(", ")
    .slice(0, 120);
  const amountLabel = `${order.currency} ${Number(order.total).toLocaleString("en-NG", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`;

  await sendNewOrderTemplate(to, {
    shopName: order.tenant.name,
    amountLabel,
    itemsSummary: itemsSummary || "Order",
    reference: order.paystackReference ?? order.id,
  });
}

async function handleOrderUpdate(
  orderId: string,
  status: "paid" | "fulfilled" | "refunded"
): Promise<void> {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      buyer: true,
      tenant: { select: { name: true } },
    },
  });
  if (!order?.buyer) return;
  if (!buyerWantsWhatsApp(order.buyer.notificationPrefs)) return;

  const to = recipientNumber(order.buyer);
  if (!to) return;

  const statusLabel =
    status === "paid"
      ? "Payment received"
      : status === "fulfilled"
        ? "Order on the way"
        : "Refund update";

  let detail = `${order.currency} ${Number(order.total).toLocaleString("en-NG")}`;
  if (status === "fulfilled") {
    const tracking = [order.trackingCarrier, order.trackingNumber].filter(Boolean).join(" ");
    detail = tracking || "Your order was marked fulfilled";
  } else if (status === "refunded") {
    detail = "A refund was started for this order";
  }

  await sendOrderUpdateTemplate(to, {
    statusLabel,
    shopName: order.tenant.name,
    detail,
    reference: order.paystackReference ?? order.id.slice(0, 12),
  });
}

async function handleReminder(payload: Extract<WhatsAppJobPayload, { kind: "reminder" }>) {
  const user = await prisma.user.findUnique({ where: { id: payload.userId } });
  if (!user) return;
  const to = recipientNumber(user);
  if (!to) return;
  await sendReminderTemplate(to, {
    title: payload.title,
    body: payload.body,
    actionHint: payload.actionHint,
  });
}

export function startWhatsAppWorker(): Worker<WhatsAppJobPayload> {
  const worker = new Worker<WhatsAppJobPayload>(
    QUEUE_WHATSAPP,
    async (job: Job<WhatsAppJobPayload>) => {
      if (job.data.kind === "new_order") {
        await handleNewOrder(job.data.orderId);
      } else if (job.data.kind === "order_update") {
        await handleOrderUpdate(job.data.orderId, job.data.status);
      } else if (job.data.kind === "reminder") {
        await handleReminder(job.data);
      }
    },
    { connection: getRedisConnection(), concurrency: 2 }
  );
  worker.on("failed", (job, err) => {
    console.error(`[worker] whatsapp ${job?.id} failed:`, err.message);
  });
  console.log("[worker] WhatsApp worker started");
  return worker;
}
