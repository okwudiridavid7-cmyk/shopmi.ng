import type { PrismaClient } from "@prisma/client";

/**
 * Shared seller basics - every tier, Freemi included. Only list features that
 * exist in the product; `ai`, `customDomain`, `freeDomain`, `staffAccounts` and the
 * monthly AI quotas are enforced by the API (src/lib/plans.ts).
 */
const BASIC_SELLER_FEATURES = {
  storefront: true,
  products: true,
  checkout: true,
  orders: true,
  invoices: true,
  campaigns: true,
  whatsapp: true,
} as const;

/**
 * Public pricing tiers (monthly NGN). Longer intervals are discounted on the
 * pricing page: 6 months ≈ 15% off, yearly ≈ 30% off (cheapest).
 * New shops trial the top paid plan, then drop to Freemi when the trial ends.
 */
export const PLANS = [
  {
    name: "Freemi",
    slug: "freemi",
    price: 0,
    currency: "NGN",
    productLimit: 10 as number | null,
    trialDays: 0,
    featureFlags: {
      ...BASIC_SELLER_FEATURES,
      ai: false,
      aiDescriptionsPerMonth: 0,
      imageEnhancePerMonth: 0,
      customDomain: false,
      freeDomain: false,
      staffAccounts: 0,
      description: "For trying things out with a small catalog.",
      benefits: [
        "10 live products",
        "Branded storefront",
        "Paystack checkout",
        "Orders & invoices",
        "Promo pop-ups",
        "WhatsApp chat & order alerts",
      ],
      recommended: false,
      cta: "select",
    },
  },
  {
    name: "Yomi",
    slug: "yomi",
    price: 3000,
    currency: "NGN",
    productLimit: 50 as number | null,
    trialDays: 14,
    featureFlags: {
      ...BASIC_SELLER_FEATURES,
      ai: true,
      aiDescriptionsPerMonth: 50,
      imageEnhancePerMonth: 20,
      customDomain: false,
      freeDomain: false,
      staffAccounts: 1,
      description: "For new sellers building out their first catalog.",
      benefits: [
        "Everything in Freemi",
        "50 live products",
        "50 AI descriptions a month",
        "20 photo background removals a month",
        "1 team member",
      ],
      recommended: false,
      cta: "select",
    },
  },
  {
    name: "Lemi",
    slug: "lemi",
    price: 7500,
    currency: "NGN",
    productLimit: 200 as number | null,
    trialDays: 14,
    featureFlags: {
      ...BASIC_SELLER_FEATURES,
      ai: true,
      aiDescriptionsPerMonth: 200,
      imageEnhancePerMonth: 60,
      customDomain: true,
      freeDomain: false,
      staffAccounts: 3,
      description: "For growing shops that want their own domain and a small team.",
      benefits: [
        "Everything in Yomi",
        "200 live products",
        "200 AI descriptions and 60 background removals a month",
        "Custom domain",
        "3 team members",
      ],
      recommended: false,
      cta: "select",
    },
  },
  {
    name: "Dami",
    slug: "dami",
    price: 15000,
    currency: "NGN",
    productLimit: null as number | null,
    trialDays: 14,
    featureFlags: {
      ...BASIC_SELLER_FEATURES,
      ai: true,
      aiDescriptionsPerMonth: 1000,
      imageEnhancePerMonth: 200,
      customDomain: true,
      freeDomain: true,
      staffAccounts: 10,
      description: "For established sellers with a large catalog and team.",
      benefits: [
        "Everything in Lemi",
        "Unlimited products",
        "1,000 AI descriptions and 200 background removals a month",
        "Free .com.ng domain",
        "10 team members",
      ],
      recommended: true,
      cta: "demo",
    },
  },
];

/** Upsert PLANS; featureFlags are replaced so removed features disappear. */
export async function upsertPlans(prisma: PrismaClient) {
  for (const plan of PLANS) {
    const data = {
      name: plan.name,
      price: plan.price,
      currency: plan.currency,
      productLimit: plan.productLimit,
      featureFlags: plan.featureFlags,
      trialDays: plan.trialDays,
      active: true,
    };
    await prisma.plan.upsert({
      where: { slug: plan.slug },
      create: { slug: plan.slug, ...data },
      update: data,
    });
  }
}

/** Pre-Freemi tiers, mapped to the closest current plan at the same or better terms. */
const LEGACY_PLAN_MAP: Record<string, string[]> = {
  free: ["freemi"],
  starter: ["lemi", "yomi"],
  pro: ["dami", "lemi", "yomi"],
};

/** Move shops off legacy plans, then hide those plans. Returns shops moved per legacy slug. */
export async function retireLegacyPlans(prisma: PrismaClient) {
  const moved: Record<string, number> = {};
  for (const [slug, targets] of Object.entries(LEGACY_PLAN_MAP)) {
    const legacy = await prisma.plan.findUnique({ where: { slug } });
    if (!legacy) continue;
    const target = await prisma.plan.findFirst({
      where: { slug: { in: targets }, active: true },
      orderBy: { price: "desc" },
    });
    if (target) {
      const { count } = await prisma.tenant.updateMany({
        where: { planId: legacy.id },
        data: { planId: target.id },
      });
      moved[slug] = count;
    }
    await prisma.plan.update({
      where: { id: legacy.id },
      data: { active: false },
    });
  }
  return moved;
}
