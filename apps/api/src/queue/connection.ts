import { Queue } from "bullmq";
import IORedis from "ioredis";
import { env } from "../config/env";

export const QUEUE_AI_DESCRIPTION = "ai-description";
export const QUEUE_AI_IMAGE = "ai-image";
export const QUEUE_CONTACT_MAIL = "contact-mail";
export const QUEUE_CONTACT_PURGE = "contact-purge";
export const QUEUE_PLAN_LIFECYCLE = "plan-lifecycle";
export const QUEUE_DOMAINS = "domains";
export const QUEUE_ORDER_EVENTS = "order-events";
export const QUEUE_WHATSAPP = "whatsapp";

let connection: IORedis | null = null;

export function getRedisConnection(): IORedis {
  if (!connection) {
    connection = new IORedis(env.redisUrl, {
      maxRetriesPerRequest: null,
    });
  }
  return connection;
}

let descriptionQueue: Queue | null = null;

export function getDescriptionQueue(): Queue {
  if (!descriptionQueue) {
    descriptionQueue = new Queue(QUEUE_AI_DESCRIPTION, {
      connection: getRedisConnection(),
      defaultJobOptions: {
        removeOnComplete: 100,
        removeOnFail: 50,
        attempts: 2,
        backoff: { type: "exponential", delay: 2000 },
      },
    });
  }
  return descriptionQueue;
}

export type DescriptionJobPayload = {
  aiJobId: string;
  tenantId: string;
  title: string;
  categoryName?: string;
  shopCategoryName?: string;
  brandName?: string;
  location?: string;
  productId?: string;
};

export type EnhanceJobPayload = {
  aiJobId: string;
  tenantId: string;
  sourceKey: string;
};

let imageQueue: Queue<EnhanceJobPayload> | null = null;

/** Photoroom background removal; paid per call, so only one retry. */
export function getImageEnhanceQueue(): Queue<EnhanceJobPayload> {
  if (!imageQueue) {
    imageQueue = new Queue<EnhanceJobPayload>(QUEUE_AI_IMAGE, {
      connection: getRedisConnection(),
      defaultJobOptions: {
        removeOnComplete: 100,
        removeOnFail: 50,
        attempts: 2,
        backoff: { type: "exponential", delay: 5000 },
      },
    });
  }
  return imageQueue;
}

/** Payload for async contact email delivery (REM-15). */
export type ContactMailJobPayload = {
  inquiryId: string;
  to: string;
  subject: string;
  html: string;
  replyTo: string;
};

let contactMailQueue: Queue | null = null;

export function getContactMailQueue(): Queue {
  if (!contactMailQueue) {
    contactMailQueue = new Queue(QUEUE_CONTACT_MAIL, {
      connection: getRedisConnection(),
      defaultJobOptions: {
        removeOnComplete: 200,
        removeOnFail: 100,
        /** Controlled retries - worker skips if providerMessageId already set. */
        attempts: 5,
        backoff: { type: "exponential", delay: 3000 },
      },
    });
  }
  return contactMailQueue;
}

let contactPurgeQueue: Queue | null = null;

export function getContactPurgeQueue(): Queue {
  if (!contactPurgeQueue) {
    contactPurgeQueue = new Queue(QUEUE_CONTACT_PURGE, {
      connection: getRedisConnection(),
      defaultJobOptions: {
        removeOnComplete: 30,
        removeOnFail: 30,
        attempts: 2,
        backoff: { type: "exponential", delay: 5000 },
      },
    });
  }
  return contactPurgeQueue;
}

let planLifecycleQueue: Queue | null = null;

export function getPlanLifecycleQueue(): Queue {
  if (!planLifecycleQueue) {
    planLifecycleQueue = new Queue(QUEUE_PLAN_LIFECYCLE, {
      connection: getRedisConnection(),
      defaultJobOptions: {
        removeOnComplete: 30,
        removeOnFail: 30,
        attempts: 2,
        backoff: { type: "exponential", delay: 5000 },
      },
    });
  }
  return planLifecycleQueue;
}

export type DomainJobPayload =
  | { kind: "register"; registeredDomainId: string }
  | { kind: "renew"; registeredDomainId: string; years: number };

let domainsQueue: Queue<DomainJobPayload> | null = null;

/** Registrar calls; retried with a long backoff because registries can be briefly unavailable. */
export function getDomainsQueue(): Queue<DomainJobPayload> {
  if (!domainsQueue) {
    domainsQueue = new Queue<DomainJobPayload>(QUEUE_DOMAINS, {
      connection: getRedisConnection(),
      defaultJobOptions: {
        removeOnComplete: 200,
        removeOnFail: 200,
        attempts: 5,
        backoff: { type: "exponential", delay: 30_000 },
      },
    });
  }
  return domainsQueue;
}

export type OrderEventPayload =
  | { kind: "paid"; orderId: string }
  | { kind: "refunded"; orderId: string };

let orderEventsQueue: Queue<OrderEventPayload> | null = null;

/** Side effects of order state changes (invoice, emails, WhatsApp), retried independently of the webhook. */
export function getOrderEventsQueue(): Queue<OrderEventPayload> {
  if (!orderEventsQueue) {
    orderEventsQueue = new Queue<OrderEventPayload>(QUEUE_ORDER_EVENTS, {
      connection: getRedisConnection(),
      defaultJobOptions: {
        removeOnComplete: 500,
        removeOnFail: 500,
        attempts: 6,
        backoff: { type: "exponential", delay: 10_000 },
      },
    });
  }
  return orderEventsQueue;
}

/** Hourly sweep: plan reminders, then expiry to the free plan (idempotent). */
export async function ensurePlanLifecycleSchedule(): Promise<void> {
  await getPlanLifecycleQueue().upsertJobScheduler(
    "plan-lifecycle-hourly",
    { pattern: "5 * * * *" },
    { name: "plan-lifecycle", data: {} }
  );
}

/** Ensure the daily retention purge is scheduled (idempotent). */
export async function ensureContactPurgeSchedule(): Promise<void> {
  const queue = getContactPurgeQueue();
  await queue.upsertJobScheduler(
    "contact-inquiry-purge-daily",
    {
      // Daily at 03:15 UTC
      pattern: "15 3 * * *",
    },
    {
      name: "purge-expired",
      data: {},
    }
  );
}
