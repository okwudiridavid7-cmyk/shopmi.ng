import { Worker } from "bullmq";
import {
  getRedisConnection,
  QUEUE_CONTACT_PURGE,
  ensureContactPurgeSchedule,
} from "./connection";
import { purgeExpiredContactInquiries } from "../services/contactRetention";

export function startContactPurgeWorker(): Worker {
  const worker = new Worker(
    QUEUE_CONTACT_PURGE,
    async () => {
      return purgeExpiredContactInquiries();
    },
    { connection: getRedisConnection(), concurrency: 1 }
  );

  worker.on("failed", (job, err) => {
    console.error(
      `[worker] contact-purge job ${job?.id} failed:`,
      err.message
    );
  });

  void ensureContactPurgeSchedule().catch((err) => {
    console.error(
      "[worker] failed to schedule contact purge:",
      err instanceof Error ? err.message : err
    );
  });

  console.log("[worker] Contact inquiry purge worker started");
  return worker;
}
