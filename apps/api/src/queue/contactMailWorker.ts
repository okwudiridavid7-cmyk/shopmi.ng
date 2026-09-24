import { Worker } from "bullmq";
import {
  getRedisConnection,
  QUEUE_CONTACT_MAIL,
  type ContactMailJobPayload,
} from "./connection";
import { processContactMailJob } from "./processContactMail";

export function startContactMailWorker(): Worker {
  const worker = new Worker<ContactMailJobPayload>(
    QUEUE_CONTACT_MAIL,
    async (job) => {
      const result = await processContactMailJob(job.data);
      if (result.outcome === "failed") {
        // processContactMailJob throws on send failure; this branch is unused
        throw new Error(result.error);
      }
      return result;
    },
    { connection: getRedisConnection(), concurrency: 4 }
  );

  worker.on("failed", (job, err) => {
    console.error(
      `[worker] contact-mail job ${job?.id} failed:`,
      err.message
    );
  });

  console.log("[worker] Contact mail worker started");
  return worker;
}
