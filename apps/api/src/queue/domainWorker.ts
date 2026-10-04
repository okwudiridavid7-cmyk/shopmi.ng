import { Worker, type Job } from "bullmq";
import { getRedisConnection, QUEUE_DOMAINS, type DomainJobPayload } from "./connection";
import {
  markDomainJobFailed,
  noteDomainJobError,
  processDomainRegistration,
  processDomainRenewal,
} from "../services/domains";

export function startDomainWorker(): Worker<DomainJobPayload> {
  const worker = new Worker<DomainJobPayload>(
    QUEUE_DOMAINS,
    async (job: Job<DomainJobPayload>) => {
      if (job.data.kind === "register") {
        await processDomainRegistration(job.data.registeredDomainId);
      } else {
        await processDomainRenewal(job.data.registeredDomainId, job.data.years);
      }
    },
    { connection: getRedisConnection(), concurrency: 2 }
  );

  worker.on("failed", (job, err) => {
    if (!job) return;
    console.error(`[worker] domain ${job.data.kind} ${job.data.registeredDomainId} failed:`, err.message);
    const final = job.attemptsMade >= (job.opts.attempts ?? 1);
    const update = final
      ? markDomainJobFailed(job.data.registeredDomainId, job.data.kind, err.message)
      : noteDomainJobError(job.data.registeredDomainId, err.message);
    void update.catch(() => undefined);
  });

  console.log("[worker] Domain worker started");
  return worker;
}
