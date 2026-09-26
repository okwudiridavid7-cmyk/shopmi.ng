import { Router } from "express";
import { prisma } from "../db/prisma";
import { decimalToNumber } from "../lib/serialize";
import { isBillingEnabled } from "../lib/platformSettings";

export const plansRouter = Router();

/** Public: active pricing plans (Yomi / Lemi / Dami). */
plansRouter.get("/", async (_req, res, next) => {
  try {
    const billingEnabled = await isBillingEnabled();
    if (!billingEnabled) {
      return res.json({ billingEnabled: false, plans: [] });
    }
    const plans = await prisma.plan.findMany({
      where: { active: true },
      orderBy: { price: "asc" },
    });
    return res.json({
      billingEnabled: true,
      plans: plans.map((p) => ({
        id: p.id,
        name: p.name,
        slug: p.slug,
        price: decimalToNumber(p.price),
        currency: p.currency,
        productLimit: p.productLimit,
        featureFlags: (p.featureFlags as Record<string, unknown>) ?? {},
        trialDays: p.trialDays,
        active: p.active,
      })),
    });
  } catch (err) {
    return next(err);
  }
});
