import { Worker } from "bullmq";
import { getRedisConnection, QUEUE_ORDER_EVENTS, type OrderEventPayload } from "./connection";
import { runOrderEvent } from "../services/orders";

export function startOrderEventsWorker(): Worker<OrderEventPayload> {
  const worker = new Worker<OrderEventPayload>(
    QUEUE_ORDER_EVENTS,
    async (job) => {
      await runOrderEvent(job.data);
    },
    { connection: getRedisConnection(), concurrency: 4 }
  );
  worker.on("failed", (job, err) => {
    console.error(`[worker] order-events ${job?.name} ${job?.data.orderId} failed:`, err.message);
  });
  console.log("[worker] Order events worker started");
  return worker;
}
