import path from "path";
import dotenv from "dotenv";
import { PrismaClient } from "@prisma/client";
import * as argon2 from "argon2";
import { Country, State } from "country-state-city";
import {
  MARKETPLACE_TAXONOMY,
  type CategorySeedNode,
} from "./taxonomy";

dotenv.config({ path: path.resolve(__dirname, "../../../.env") });
dotenv.config({ path: path.resolve(__dirname, "../.env") });

const prisma = new PrismaClient();

const DEFAULT_SETTINGS: { key: string; value: string }[] = [
  { key: "app_name", value: process.env.APP_NAME ?? "Vendors" },
  { key: "web_url", value: process.env.WEB_URL ?? "http://localhost:3000" },
  { key: "support_email", value: "support@shopmi.ng" },
  { key: "verification_required", value: "false" },
  { key: "ai_features_enabled", value: "true" },
  { key: "watermark_default_on", value: "true" },
  { key: "trial_days", value: "3" },
  { key: "commission_percent", value: "5" },
  /** When false, hide public pricing and plan CTAs site-wide. */
  { key: "billing_enabled", value: "true" },
  /** When true, checkout requires a verified email address. */
  { key: "email_verification_required", value: "false" },
  {
    key: "homepage_banners",
    value: JSON.stringify([
      {
        id: "default-platform-1",
        imageUrl:
          "https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?auto=format&fit=crop&w=1920&q=80",
        title: "Independent shops. Real checkout.",
        subtitle:
          "Find makers and retailers with branded storefronts — pay once, track your order.",
        ctaText: "Start browsing",
        ctaUrl: "#marketplace",
        scrollSpeed: 6,
        displayOrder: 0,
        active: true,
      },
    ]),
  },
];

/** Shared seller basics — every paid tier includes these. */
const BASIC_SELLER_FEATURES = {
  ai: true,
  campaigns: true,
  whatsapp: true,
  invoices: true,
  storefront: true,
  orders: true,
  products: true,
} as const;

const BRANDS = [
  { name: "Generic", slug: "generic" },
  { name: "Acme", slug: "acme" },
  { name: "Nova", slug: "nova" },
  { name: "Pulse", slug: "pulse" },
];

/**
 * Public pricing tiers (monthly NGN). Longer intervals are discounted on the
 * pricing page: 6 months ≈ 15% off, yearly ≈ 30% off (cheapest).
 * New shops default to Yomi with a free trial (no card required).
 */
const PLANS = [
  {
    name: "Yomi",
    slug: "yomi",
    price: 3000,
    currency: "NGN",
    productLimit: 50,
    trialDays: 3,
    featureFlags: {
      ...BASIC_SELLER_FEATURES,
      customDomain: false,
      analytics: "basic",
      staffAccounts: 1,
      storeLocations: 1,
      description:
        "For new sellers launching their first storefront and catalog.",
      benefits: [
        "Add & manage products",
        "Business website / storefront",
        "Invoices & receipts",
        "Order management",
        "Campaigns & WhatsApp tools",
        "AI listing help",
        "1 staff account",
      ],
      limitations: [
        "No custom domain",
        "Basic analytics only",
        "1 store location",
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
    productLimit: 200,
    trialDays: 3,
    featureFlags: {
      ...BASIC_SELLER_FEATURES,
      customDomain: true,
      analytics: "business",
      staffAccounts: 3,
      storeLocations: 1,
      pixels: true,
      description:
        "For growing shops that need a domain, team access, and deeper insights.",
      benefits: [
        "Everything in Yomi",
        "Custom domain",
        "3 staff accounts",
        "Business analytics",
        "Facebook Pixel & Google Analytics",
        "Priority email support",
      ],
      limitations: ["1 store location", "No wholesale pricing"],
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
    trialDays: 3,
    featureFlags: {
      ...BASIC_SELLER_FEATURES,
      customDomain: true,
      analytics: "advanced",
      staffAccounts: 10,
      storeLocations: 3,
      pixels: true,
      wholesale: true,
      shipmentTracking: true,
      pos: true,
      description:
        "For established sellers running multi-location or high-volume shops.",
      benefits: [
        "Everything in Lemi",
        "Unlimited products",
        "10 staff accounts",
        "3 store locations",
        "Wholesale pricing",
        "Shipment tracking",
        "POS software",
        "Dedicated onboarding",
      ],
      limitations: [] as string[],
      recommended: true,
      cta: "demo",
    },
  },
];

const LEGACY_PLAN_SLUGS = ["free", "starter", "pro"] as const;

async function seedCategoryTree(
  nodes: CategorySeedNode[],
  parentId: string | null,
  sortBase = 0
) {
  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i]!;
    const row = await prisma.category.upsert({
      where: { slug: node.slug },
      create: {
        name: node.name,
        slug: node.slug,
        parentId,
        sortOrder: sortBase + i,
      },
      update: {
        name: node.name,
        parentId,
        sortOrder: sortBase + i,
      },
    });
    if (node.children?.length) {
      await seedCategoryTree(node.children, row.id, 0);
    }
  }
}

async function seedGeo() {
  const countries = Country.getAllCountries();
  let countryCount = 0;
  let stateCount = 0;

  for (const c of countries) {
    const country = await prisma.country.upsert({
      where: { iso2: c.isoCode },
      create: { name: c.name, iso2: c.isoCode },
      update: { name: c.name },
    });
    countryCount += 1;

    const states = State.getStatesOfCountry(c.isoCode);
    for (const s of states) {
      const iso2 = s.isoCode || null;
      if (iso2) {
        await prisma.state.upsert({
          where: {
            countryIso2_iso2: { countryIso2: c.isoCode, iso2 },
          },
          create: {
            name: s.name,
            iso2,
            countryId: country.id,
            countryIso2: c.isoCode,
          },
          update: { name: s.name, countryId: country.id },
        });
      } else {
        const existing = await prisma.state.findFirst({
          where: { countryIso2: c.isoCode, name: s.name, iso2: null },
        });
        if (!existing) {
          await prisma.state.create({
            data: {
              name: s.name,
              iso2: null,
              countryId: country.id,
              countryIso2: c.isoCode,
            },
          });
        }
      }
      stateCount += 1;
    }
  }

  console.log(`Seeded ${countryCount} countries, ${stateCount} states`);
}

async function main() {
  const email = process.env.SUPER_ADMIN_EMAIL;
  const password = process.env.SUPER_ADMIN_PASSWORD;

  if (!email || !password) {
    throw new Error(
      "Set SUPER_ADMIN_EMAIL and SUPER_ADMIN_PASSWORD in .env before seeding"
    );
  }

  const passwordHash = await argon2.hash(password, { type: argon2.argon2id });

  const rawAdminName =
    process.env.SUPER_ADMIN_NAME?.trim() ||
    email.split("@")[0]?.split(/[._-]/)[0] ||
    "Admin";
  const adminDisplayName =
    rawAdminName.charAt(0).toUpperCase() + rawAdminName.slice(1);

  const admin = await prisma.user.upsert({
    where: { email: email.toLowerCase() },
    create: {
      email: email.toLowerCase(),
      passwordHash,
      role: "super_admin",
      name: adminDisplayName,
    },
    update: {
      passwordHash,
      role: "super_admin",
    },
  });

  if (!admin.name) {
    await prisma.user.update({
      where: { id: admin.id },
      data: { name: adminDisplayName },
    });
  }

  const brandingKeys = new Set(["app_name", "web_url"]);
  for (const setting of DEFAULT_SETTINGS) {
    await prisma.platformSetting.upsert({
      where: { key: setting.key },
      create: setting,
      // Keep admin-edited site name/URL; refresh other defaults on re-seed
      update: brandingKeys.has(setting.key) ? {} : { value: setting.value },
    });
  }

  await seedCategoryTree(MARKETPLACE_TAXONOMY, null);

  // Remap legacy flat categories onto the new tree so existing products keep working.
  const legacyMap: Record<string, string> = {
    electronics: "electronics-gadgets",
    "home-living": "home-kitchen",
    beauty: "beauty-health-personal-care",
    sports: "sports-outdoors",
  };
  for (const [oldSlug, newSlug] of Object.entries(legacyMap)) {
    const [oldCat, newCat] = await Promise.all([
      prisma.category.findUnique({ where: { slug: oldSlug } }),
      prisma.category.findUnique({ where: { slug: newSlug } }),
    ]);
    if (oldCat && newCat && oldCat.id !== newCat.id) {
      await prisma.product.updateMany({
        where: { categoryId: oldCat.id },
        data: { categoryId: newCat.id },
      });
      await prisma.category.delete({ where: { id: oldCat.id } }).catch(() => {
        /* may still be referenced */
      });
    }
  }

  for (const brand of BRANDS) {
    await prisma.brand.upsert({
      where: { slug: brand.slug },
      create: brand,
      update: { name: brand.name },
    });
  }

  for (const plan of PLANS) {
    await prisma.plan.upsert({
      where: { slug: plan.slug },
      create: {
        name: plan.name,
        slug: plan.slug,
        price: plan.price,
        currency: plan.currency,
        productLimit: plan.productLimit,
        featureFlags: plan.featureFlags,
        trialDays: plan.trialDays,
        active: true,
      },
      update: {
        name: plan.name,
        price: plan.price,
        currency: plan.currency,
        productLimit: plan.productLimit,
        featureFlags: plan.featureFlags,
        trialDays: plan.trialDays,
        active: true,
      },
    });
  }

  // Remap tenants on legacy free/starter/pro → Yomi/Lemi/Dami, then deactivate legacy.
  const yomi = await prisma.plan.findUnique({ where: { slug: "yomi" } });
  const lemi = await prisma.plan.findUnique({ where: { slug: "lemi" } });
  const dami = await prisma.plan.findUnique({ where: { slug: "dami" } });
  const planLegacyMap: Record<string, string | undefined> = {
    free: yomi?.id,
    starter: lemi?.id ?? yomi?.id,
    pro: dami?.id ?? lemi?.id ?? yomi?.id,
  };
  for (const slug of LEGACY_PLAN_SLUGS) {
    const legacy = await prisma.plan.findUnique({ where: { slug } });
    if (!legacy) continue;
    const nextId = planLegacyMap[slug];
    if (nextId) {
      await prisma.tenant.updateMany({
        where: { planId: legacy.id },
        data: { planId: nextId },
      });
    }
    await prisma.plan.update({
      where: { id: legacy.id },
      data: { active: false },
    });
  }

  await seedGeo();

  console.log(`Seeded super_admin ${admin.email} and marketplace taxonomy`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
