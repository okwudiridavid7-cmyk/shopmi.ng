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
  { key: "support_email", value: "support@vendors.local" },
  { key: "verification_required", value: "false" },
  { key: "ai_features_enabled", value: "true" },
  { key: "watermark_default_on", value: "true" },
  { key: "trial_days", value: "3" },
  { key: "commission_percent", value: "5" },
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

const BRANDS = [
  { name: "Generic", slug: "generic" },
  { name: "Acme", slug: "acme" },
  { name: "Nova", slug: "nova" },
  { name: "Pulse", slug: "pulse" },
];

const PLANS = [
  {
    name: "Free",
    slug: "free",
    price: 0,
    currency: "NGN",
    productLimit: 10,
    featureFlags: { ai: true, campaigns: true },
    trialDays: 3,
  },
  {
    name: "Starter",
    slug: "starter",
    price: 5000,
    currency: "NGN",
    productLimit: 50,
    featureFlags: { ai: true, campaigns: true, customDomain: true },
    trialDays: 3,
  },
  {
    name: "Pro",
    slug: "pro",
    price: 15000,
    currency: "NGN",
    productLimit: null as number | null,
    featureFlags: {
      ai: true,
      campaigns: true,
      customDomain: true,
      whatsapp: true,
    },
    trialDays: 3,
  },
];

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

  const admin = await prisma.user.upsert({
    where: { email: email.toLowerCase() },
    create: {
      email: email.toLowerCase(),
      passwordHash,
      role: "super_admin",
    },
    update: {
      passwordHash,
      role: "super_admin",
    },
  });

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
