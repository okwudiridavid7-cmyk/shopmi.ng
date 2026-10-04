import type { TenantStatus } from "@prisma/client";
import { prisma } from "../db/prisma";

export class PlanLimitError extends Error {
  status = 403;
  constructor(message: string) {
    super(message);
    this.name = "PlanLimitError";
  }
}

export const FREE_PLAN_SLUG = "freemi";

export async function getFreePlan() {
  return prisma.plan.findFirst({ where: { slug: FREE_PLAN_SLUG, active: true } });
}

/** New shops trial the top paid plan, then drop to Freemi when the trial ends. */
export async function getDefaultTrialPlan() {
  const top = await prisma.plan.findFirst({
    where: { active: true, price: { gt: 0 } },
    orderBy: { price: "desc" },
  });
  return top ?? getFreePlan();
}

/** @deprecated Use getDefaultTrialPlan. */
export async function getDefaultFreePlan() {
  return getDefaultTrialPlan();
}

/**
 * Keep live products within the shop's plan limit. Over the limit, the least
 * recently updated live products are paused (hidden, never deleted). Under the
 * limit, paused products come back, most recently updated first.
 */
export async function applyProductLimit(
  tenantId: string
): Promise<{ paused: number; restored: number }> {
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    include: { plan: true },
  });
  if (!tenant) return { paused: 0, restored: 0 };

  const limit = tenant.plan?.productLimit ?? null;
  const live = await prisma.product.count({ where: { tenantId, status: "active" } });

  if (limit != null && live > limit) {
    const extras = await prisma.product.findMany({
      where: { tenantId, status: "active" },
      orderBy: { updatedAt: "desc" },
      skip: limit,
      select: { id: true },
    });
    await prisma.product.updateMany({
      where: { id: { in: extras.map((p) => p.id) } },
      data: { status: "paused" },
    });
    return { paused: extras.length, restored: 0 };
  }

  const room = limit == null ? undefined : limit - live;
  if (room !== undefined && room <= 0) return { paused: 0, restored: 0 };

  const toRestore = await prisma.product.findMany({
    where: { tenantId, status: "paused" },
    orderBy: { updatedAt: "desc" },
    take: room,
    select: { id: true },
  });
  if (toRestore.length > 0) {
    await prisma.product.updateMany({
      where: { id: { in: toRestore.map((p) => p.id) } },
      data: { status: "active" },
    });
  }
  return { paused: 0, restored: toRestore.length };
}

const DAY_MS = 24 * 60 * 60 * 1000;

/** Days before the end of a trial or paid period when a reminder goes out. */
export const PLAN_REMINDER_DAYS = [5, 2] as const;

/** A lapsed shop gets its old status back once it has a plan again. */
function restoredStatus(t: { status: TenantStatus; verifiedBadge: boolean }) {
  if (t.status !== "lapsed") return undefined;
  return t.verifiedBadge ? ("active" as const) : ("pending_verification" as const);
}

/** When the current paid plan (trial or paid period) ends; null if it doesn't. */
export function planEnding(t: {
  trialEndsAt: Date | null;
  planExpiresAt: Date | null;
}): { kind: "trial" | "paid"; endsAt: Date } | null {
  if (t.planExpiresAt) return { kind: "paid", endsAt: t.planExpiresAt };
  if (t.trialEndsAt) return { kind: "trial", endsAt: t.trialEndsAt };
  return null;
}

function formatDate(d: Date) {
  return d.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Africa/Lagos",
  });
}

async function mailOwner(
  tenantId: string,
  kind: "plan_reminder" | "plan_ended",
  idempotencyKey: string,
  data: Record<string, string | number | null>
) {
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    include: { owner: true },
  });
  if (!tenant?.owner.email) return;
  const [{ enqueueTransactionalMail }, { env }] = await Promise.all([
    import("../queue/transactionalMail"),
    import("../config/env"),
  ]);
  const openOrders = await prisma.order.count({ where: { tenantId, status: "paid" } });
  await enqueueTransactionalMail({
    kind,
    to: tenant.owner.email,
    idempotencyKey,
    data: {
      name: tenant.owner.name,
      shopName: tenant.name,
      planUrl: `${env.webUrl}/seller/plan`,
      ordersUrl: `${env.webUrl}/seller/orders`,
      openOrders,
      ...data,
    },
  }).catch((err) => {
    console.error(`[plans] ${kind} email failed for ${tenantId}:`, err);
  });
}

/**
 * Move shops whose trial or paid period has ended onto the free plan, pausing
 * products over its limit. Without an active free plan the shop is marked
 * lapsed instead (storefront hidden, dashboards and orders unaffected).
 * Shops on a paid plan with no end dates are comped and never expire.
 */
export async function expirePlans(tenantId?: string): Promise<number> {
  const now = new Date();
  const free = await getFreePlan();

  const due = await prisma.tenant.findMany({
    where: {
      ...(tenantId ? { id: tenantId } : {}),
      status: { not: "lapsed" },
      plan: { price: { gt: 0 } },
      OR: [{ planExpiresAt: { lte: now } }, { planExpiresAt: null, trialEndsAt: { lte: now } }],
    },
    include: { plan: true },
  });

  let moved = 0;
  for (const t of due) {
    const ending = planEnding(t);
    if (!ending) continue;

    const { count } = await prisma.tenant.updateMany({
      where: { id: t.id, trialEndsAt: t.trialEndsAt, planExpiresAt: t.planExpiresAt },
      data: free
        ? { planId: free.id, trialEndsAt: null, planExpiresAt: null, planRemindersSent: [] }
        : { status: "lapsed", trialEndsAt: null, planExpiresAt: null, planRemindersSent: [] },
    });
    if (count === 0) continue;
    moved += 1;

    const { paused } = free ? await applyProductLimit(t.id) : { paused: 0 };
    await mailOwner(t.id, "plan_ended", `plan-ended:${t.id}:${ending.endsAt.toISOString()}`, {
      kind: ending.kind,
      planName: t.plan?.name ?? "Your plan",
      freePlanName: free?.name ?? null,
      freeLimit: free?.productLimit ?? null,
      paused,
    });
  }
  return moved;
}

/**
 * Email the owner 5 and 2 days before a trial or paid period ends. The ending
 * email itself is sent by expirePlans. Each reminder goes out once per period.
 */
export async function sendPlanReminders(): Promise<number> {
  const now = Date.now();
  const horizon = new Date(now + Math.max(...PLAN_REMINDER_DAYS) * DAY_MS);
  const free = await getFreePlan();

  const upcoming = await prisma.tenant.findMany({
    where: {
      status: { not: "lapsed" },
      plan: { price: { gt: 0 } },
      OR: [
        { planExpiresAt: { gt: new Date(now), lte: horizon } },
        { planExpiresAt: null, trialEndsAt: { gt: new Date(now), lte: horizon } },
      ],
    },
    include: { plan: true },
  });

  let sent = 0;
  for (const t of upcoming) {
    const ending = planEnding(t);
    if (!ending) continue;
    const daysLeft = Math.ceil((ending.endsAt.getTime() - now) / DAY_MS);
    const stage = [...PLAN_REMINDER_DAYS].reverse().find((d) => daysLeft <= d);
    if (stage == null) continue;

    const period = ending.endsAt.toISOString().slice(0, 10);
    const key = `${period}:${stage}`;
    const { count } = await prisma.tenant.updateMany({
      where: { id: t.id, NOT: { planRemindersSent: { has: key } } },
      data: {
        planRemindersSent: {
          push: PLAN_REMINDER_DAYS.filter((d) => d >= stage).map((d) => `${period}:${d}`),
        },
      },
    });
    if (count === 0) continue;
    sent += 1;

    const liveCount = await prisma.product.count({ where: { tenantId: t.id, status: "active" } });
    const freeLimit = free?.productLimit ?? null;
    await mailOwner(t.id, "plan_reminder", `plan-reminder:${t.id}:${key}`, {
      kind: ending.kind,
      daysLeft,
      endsOn: formatDate(ending.endsAt),
      planName: t.plan?.name ?? "Your plan",
      freePlanName: free?.name ?? null,
      freeLimit,
      willPause: freeLimit != null ? Math.max(0, liveCount - freeLimit) : 0,
    });
  }
  return sent;
}

/**
 * Start or renew a paid plan for a number of months (offline payment until
 * online billing is live). Renewing the same plan early extends from the
 * current end date. Free plans have no end date.
 */
export async function activatePlan(tenantId: string, planId: string, months: number) {
  const [tenant, plan] = await Promise.all([
    prisma.tenant.findUniqueOrThrow({ where: { id: tenantId } }),
    prisma.plan.findUniqueOrThrow({ where: { id: planId } }),
  ]);
  const isFree = Number(plan.price) <= 0;
  const now = new Date();
  const base =
    tenant.planId === plan.id && tenant.planExpiresAt && tenant.planExpiresAt > now
      ? tenant.planExpiresAt
      : now;
  const expiresAt = new Date(base);
  expiresAt.setMonth(expiresAt.getMonth() + months);

  await prisma.tenant.update({
    where: { id: tenantId },
    data: {
      planId: plan.id,
      trialEndsAt: null,
      planExpiresAt: isFree ? null : expiresAt,
      planRemindersSent: [],
      status: restoredStatus(tenant),
    },
  });
  const limits = await applyProductLimit(tenantId);
  return { ...limits, planExpiresAt: isFree ? null : expiresAt };
}

/** Switch to a plan without changing billing dates (free plans, or during a trial). */
export async function switchPlan(tenantId: string, planId: string) {
  const [tenant, plan] = await Promise.all([
    prisma.tenant.findUniqueOrThrow({ where: { id: tenantId } }),
    prisma.plan.findUniqueOrThrow({ where: { id: planId } }),
  ]);
  const isFree = Number(plan.price) <= 0;
  await prisma.tenant.update({
    where: { id: tenantId },
    data: {
      planId: plan.id,
      ...(isFree ? { trialEndsAt: null, planExpiresAt: null, planRemindersSent: [] } : {}),
      status: restoredStatus(tenant),
    },
  });
  return applyProductLimit(tenantId);
}

export type PlanFeature = "ai" | "customDomain" | "freeDomain";

type PlanFlags = {
  ai?: boolean;
  customDomain?: boolean;
  freeDomain?: boolean;
  staffAccounts?: number;
};

async function tenantPlan(tenantId: string) {
  await expirePlans(tenantId);
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    include: { plan: true },
  });
  return tenant?.plan ?? null;
}

/** Shops without a plan (legacy rows) keep full access. */
export async function planAllows(tenantId: string, feature: PlanFeature): Promise<boolean> {
  const plan = await tenantPlan(tenantId);
  if (!plan) return true;
  return !!(plan.featureFlags as PlanFlags | null)?.[feature];
}

/** Team members allowed besides the owner; null means no cap. */
export async function teamSeatLimit(tenantId: string): Promise<number | null> {
  const plan = await tenantPlan(tenantId);
  if (!plan) return null;
  const seats = (plan.featureFlags as PlanFlags | null)?.staffAccounts;
  return typeof seats === "number" ? seats : 0;
}

/**
 * Throws when publishing one more product would exceed the plan limit.
 * Drafts and paused products don't count; only live listings do.
 */
export async function assertCanPublishProduct(
  tenantId: string,
  excludeProductId?: string
): Promise<void> {
  await expirePlans(tenantId);

  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    include: { plan: true },
  });
  if (!tenant) throw new PlanLimitError("Shop not found");

  const limit = tenant.plan?.productLimit;
  if (limit == null) return;

  const live = await prisma.product.count({
    where: {
      tenantId,
      status: "active",
      ...(excludeProductId ? { id: { not: excludeProductId } } : {}),
    },
  });
  if (live >= limit) {
    throw new PlanLimitError(
      `Your plan allows ${limit} live products. Upgrade or unpublish one to add more.`
    );
  }
}
