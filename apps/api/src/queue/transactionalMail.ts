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
      `[email] RESEND_API_KEY missing — skip ${payload.kind} → ${payload.to}`
    );
    return { queued: false };
  }

  try {
    const q = getTransactionalMailQueue();
    await q.add(payload.kind, payload, {
      jobId: payload.idempotencyKey,
      // Soft throttle duplicates of the same idempotency key
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

/** Per-recipient cooldown via Redis (seconds). */
async function assertRecipientThrottle(
  to: string,
  kind: string,
  cooldownSec = 30
): Promise<boolean> {
  try {
    const redis = getRedisConnection();
    const key = `mail:throttle:${kind}:${to.toLowerCase()}`;
    const set = await redis.set(key, "1", "EX", cooldownSec, "NX");
    return set === "OK";
  } catch {
    return true;
  }
}

export function startTransactionalMailWorker(): Worker<TransactionalMailJobPayload> {
  const worker = new Worker<TransactionalMailJobPayload>(
    QUEUE_TRANSACTIONAL_MAIL,
    async (job: Job<TransactionalMailJobPayload>) => {
      const { to, kind } = job.data;
      const allowed = await assertRecipientThrottle(to, kind, 20);
      if (!allowed) {
        console.info(
          `[email] throttled ${kind} → ${to} (cooldown) — skipping duplicate`
        );
        return;
      }
      await deliverTransactionalMail(job.data);
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
