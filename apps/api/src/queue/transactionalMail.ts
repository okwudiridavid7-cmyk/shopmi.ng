import { Queue, Worker, type Job } from "bullmq";
import { getRedisConnection } from "./connection";
import { sendHtmlEmail } from "../services/mail";
import {
  buildTransactionalEmail,
  type TransactionalEmailKind,
} from "../services/transactionalEmails";
import { env } from "../config/env";

export const QUEUE_TRANSACTIONAL_MAIL = "transactional-mail";

export type TransactionalMailJobPayload = {
  kind: TransactionalEmailKind;
  to: string;
  data: Record<string, string | number | null | undefined>;
  /** Optional override subject (defaults from template). */
  subject?: string;
  idempotencyKey?: string;
};

let queue: Queue<TransactionalMailJobPayload> | null = null;

export function getTransactionalMailQueue(): Queue<TransactionalMailJobPayload> {
  if (!queue) {
    queue = new Queue<TransactionalMailJobPayload>(QUEUE_TRANSACTIONAL_MAIL, {
      connection: getRedisConnection(),
      defaultJobOptions: {
        removeOnComplete: 200,
        removeOnFail: 100,
        attempts: 5,
        backoff: { type: "exponential", delay: 4000 },
      },
    });
  }
  return queue;
}

/**
 * Enqueue a branded transactional email.
 * Falls back to immediate send if Redis/queue is unavailable.
 */
export async function enqueueTransactionalMail(
  payload: TransactionalMailJobPayload
): Promise<{ queued: boolean }> {
  if (!env.resendApiKey) {
    console.warn(
      `[email] RESEND_API_KEY missing - skip ${payload.kind} → ${payload.to}`
    );
    return { queued: false };
  }

  try {
    const q = getTransactionalMailQueue();
    await q.add(payload.kind, payload, {
      // BullMQ rejects ":" in custom ids; duplicates of the same key are still collapsed.
      jobId: payload.idempotencyKey?.replace(/:/g, "-"),
    });
    return { queued: true };
  } catch (err) {
    console.warn(
      `[email] queue unavailable, sending ${payload.kind} inline:`,
      err instanceof Error ? err.message : err
    );
    await deliverTransactionalMail(payload);
    return { queued: false };
  }
}

async function deliverTransactionalMail(
  payload: TransactionalMailJobPayload
): Promise<void> {
  const built = await buildTransactionalEmail(payload.kind, payload.data);
  await sendHtmlEmail({
    to: payload.to,
    subject: payload.subject ?? built.subject,
    html: built.html,
    idempotencyKey: payload.idempotencyKey,
  });
}

/**
 * Duplicate guard. Mails with an idempotency key are sent once per key (a second
 * order from the same buyer has a different key, so it still goes out). Mails
 * without one get a short per-recipient cooldown against resend spam.
 * The marker is only kept after a successful send, so retries are never dropped.
 */
function dedupeKey(payload: TransactionalMailJobPayload): { key: string; ttlSec: number } {
  if (payload.idempotencyKey) {
    return { key: `mail:sent:${payload.idempotencyKey}`, ttlSec: 7 * 24 * 3600 };
  }
  return { key: `mail:throttle:${payload.kind}:${payload.to.toLowerCase()}`, ttlSec: 20 };
}

async function claimSend(key: string, ttlSec: number): Promise<boolean> {
  try {
    return (await getRedisConnection().set(key, "1", "EX", ttlSec, "NX")) === "OK";
  } catch {
    return true;
  }
}

async function releaseSend(key: string): Promise<void> {
  try {
    await getRedisConnection().del(key);
  } catch {
    /* best effort */
  }
}

export function startTransactionalMailWorker(): Worker<TransactionalMailJobPayload> {
  const worker = new Worker<TransactionalMailJobPayload>(
    QUEUE_TRANSACTIONAL_MAIL,
    async (job: Job<TransactionalMailJobPayload>) => {
      const { to, kind } = job.data;
      const { key, ttlSec } = dedupeKey(job.data);
      if (!(await claimSend(key, ttlSec))) {
        console.info(`[email] duplicate ${kind} → ${to} skipped`);
        return;
      }
      try {
        await deliverTransactionalMail(job.data);
      } catch (err) {
        await releaseSend(key);
        throw err;
      }
      console.info(`[email] sent ${kind} → ${to}`);
    },
    {
      connection: getRedisConnection(),
      // Global provider-friendly rate: ~8 emails / second
      limiter: { max: 8, duration: 1000 },
      concurrency: 2,
    }
  );

  worker.on("failed", (job, err) => {
    console.error(
      `[email] job failed ${job?.name} → ${job?.data.to}:`,
      err.message
    );
  });

  return worker;
}
