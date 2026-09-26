import { prisma } from "../db/prisma";

export class PlanLimitError extends Error {
  status = 403;
  constructor(message: string) {
    super(message);
    this.name = "PlanLimitError";
  }
}

export async function assertCanCreateProduct(tenantId: string): Promise<void> {
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    include: { plan: true },
  });
  if (!tenant) {
    throw new PlanLimitError("Shop not found");
  }

  const trialActive =
    tenant.trialEndsAt != null && tenant.trialEndsAt.getTime() > Date.now();

  const plan = tenant.plan;
  if (!trialActive && plan && Number(plan.price) > 0) {
    // Paid plan past trial with no billing yet — still allow if they have a plan assigned.
    // Free plan past trial continues with product limit only.
  }

  if (plan?.productLimit != null) {
    const count = await prisma.product.count({ where: { tenantId } });
    if (count >= plan.productLimit) {
      throw new PlanLimitError(
        `Product limit reached (${plan.productLimit}). Upgrade your plan to add more.`
      );
    }
  }
}

export async function getDefaultTrialPlan() {
  const yomi = await prisma.plan.findUnique({ where: { slug: "yomi" } });
  if (yomi) return yomi;
  // Legacy fallback while DBs migrate off the old free tier.
  return prisma.plan.findUnique({ where: { slug: "free" } });
}

/** @deprecated Use getDefaultTrialPlan — new shops start on Yomi with trialDays. */
export async function getDefaultFreePlan() {
  return getDefaultTrialPlan();
}
