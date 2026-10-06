import type { AiJob, Prisma } from "@prisma/client";
import { prisma } from "../db/prisma";
import { aiMonthlyQuota, type AiQuotaKind } from "./plans";

export class AiQuotaError extends Error {
  status = 429;
  code = "AI_QUOTA";
}

/** Start of the current calendar month in Lagos (UTC+1, no DST). */
export function quotaPeriodStart(now = new Date()): Date {
  const lagos = new Date(now.getTime() + 60 * 60 * 1000);
  return new Date(Date.UTC(lagos.getUTCFullYear(), lagos.getUTCMonth(), 1) - 60 * 60 * 1000);
}

/** Failed jobs don't count against the allowance. */
async function usedThisMonth(db: Prisma.TransactionClient, tenantId: string, kind: AiQuotaKind) {
  return db.aiJob.count({
    where: { tenantId, type: kind, status: { not: "failed" }, createdAt: { gte: quotaPeriodStart() } },
  });
}

export async function aiUsage(tenantId: string, kind: AiQuotaKind) {
  const [used, limit] = await Promise.all([usedThisMonth(prisma, tenantId, kind), aiMonthlyQuota(tenantId, kind)]);
  return { used, limit, remaining: Math.max(0, limit - used) };
}

/**
 * Creates the job only if the shop has allowance left. The per-shop advisory lock makes
 * the count and insert atomic, so parallel requests can't overshoot the quota.
 */
export async function reserveAiJob(input: {
  tenantId: string;
  userId: string;
  kind: AiQuotaKind;
  input: Prisma.InputJsonValue;
  productId?: string | null;
}): Promise<AiJob> {
  const limit = await aiMonthlyQuota(input.tenantId, input.kind);
  return prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`ai-quota:${input.tenantId}:${input.kind}`}))`;
    const used = await usedThisMonth(tx, input.tenantId, input.kind);
    if (used >= limit) {
      throw new AiQuotaError(
        input.kind === "description"
          ? `You've used all ${limit} AI descriptions for this month. Your allowance resets on the 1st.`
          : `You've used all ${limit} background removals for this month. Your allowance resets on the 1st.`
      );
    }
    return tx.aiJob.create({
      data: {
        tenantId: input.tenantId,
        userId: input.userId,
        type: input.kind,
        status: "queued",
        productId: input.productId ?? null,
        input: input.input,
      },
    });
  });
}
