import { Queue, Worker, type Job } from "bullmq";
import { prisma } from "../db/prisma";
import { planAllows } from "../lib/plans";
import { sendNewOrderTemplate } from "../services/whatsapp";
import { getRedisConnection, QUEUE_WHATSAPP } from "./connection";

export type WhatsAppJobPayload =
  | {
      kind: "new_order";
      orderId: string;
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
  const jobId =
    payload.kind === "new_order" ? `wa-new-order-${payload.orderId}` : undefined;
  await getWhatsAppQueue().add(payload.kind, payload, jobId ? { jobId } : undefined);
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

  const to = order.tenant.owner.whatsappNumber || order.tenant.owner.phone || null;
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

export function startWhatsAppWorker(): Worker<WhatsAppJobPayload> {
  const worker = new Worker<WhatsAppJobPayload>(
    QUEUE_WHATSAPP,
    async (job: Job<WhatsAppJobPayload>) => {
      if (job.data.kind === "new_order") {
        await handleNewOrder(job.data.orderId);
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
