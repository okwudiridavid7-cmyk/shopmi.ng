/**
 * Local E2E helper: provisions dedicated test accounts (idempotent) and prints short-lived
 * access tokens plus a few public paths as JSON. Refuses to run in production.
 * Usage: pnpm --filter @vendors/api exec tsx scripts/e2e-tokens.ts
 */
import { Prisma } from "@prisma/client";
import { env } from "../src/config/env";
import { prisma } from "../src/db/prisma";
import { signAccessToken } from "../src/auth/tokens";

const SELLER_EMAIL = "e2e.seller@example.com";
const BUYER_EMAIL = "e2e.buyer@example.com";
const SHOP_SLUG = "e2e-shop";

async function main() {
  if (env.isProd) throw new Error("e2e-tokens is for local testing only");

  const seller = await prisma.user.upsert({
    where: { email: SELLER_EMAIL },
    update: {},
    create: { email: SELLER_EMAIL, role: "seller", name: "E2E Seller", emailVerifiedAt: new Date() },
  });
  const buyer = await prisma.user.upsert({
    where: { email: BUYER_EMAIL },
    update: {},
    create: { email: BUYER_EMAIL, role: "buyer", name: "E2E Buyer", emailVerifiedAt: new Date() },
  });

  const topPlan = await prisma.plan.findFirst({
    where: { active: true, price: { gt: 0 } },
    orderBy: { price: "desc" },
  });
  let tenant = await prisma.tenant.findUnique({ where: { slug: SHOP_SLUG } });
  if (!tenant) {
    tenant = await prisma.tenant.create({
      data: {
        ownerUserId: seller.id,
        name: "E2E Shop",
        slug: SHOP_SLUG,
        status: "active",
        verifiedBadge: true,
        planId: topPlan?.id,
        trialEndsAt: new Date(Date.now() + 14 * 86400_000),
        tenantAdmins: { create: { userId: seller.id, role: "owner" } },
      },
    });
  }
  let product = await prisma.product.findFirst({ where: { tenantId: tenant.id, title: "E2E Tote" } });
  if (!product) {
    product = await prisma.product.create({
      data: {
        tenantId: tenant.id,
        title: "E2E Tote",
        description: "A sturdy canvas tote used by the end-to-end tests.",
        price: new Prisma.Decimal(2500),
        stockQty: 50,
        images: [],
        status: "active",
      },
    });
  } else if (product.stockQty < 10) {
    await prisma.product.update({ where: { id: product.id }, data: { stockQty: 50 } });
  }
  await prisma.cart.deleteMany({ where: { userId: buyer.id } });
  await prisma.product.deleteMany({ where: { tenantId: tenant.id, title: { startsWith: "E2E Upload " } } });

  const admin = await prisma.user.findFirst({ where: { role: "super_admin" } });
  const token = (u: { id: string; email: string; role: Parameters<typeof signAccessToken>[0]["role"] }) =>
    signAccessToken({ sub: u.id, email: u.email, role: u.role });

  const shops = await prisma.tenant.findMany({
    where: { status: { in: ["active", "pending_verification"] }, products: { some: { status: "active" } } },
    select: { slug: true },
    take: 6,
  });

  process.stdout.write(
    JSON.stringify({
      seller: token(seller),
      buyer: token(buyer),
      admin: admin ? token(admin) : null,
      shopSlug: SHOP_SLUG,
      productPath: `/shops/${SHOP_SLUG}/products/${product.id}`,
      productId: product.id,
      shopSlugs: shops.map((s) => s.slug),
      paystackTestMode: env.paystackSecretKey.startsWith("sk_test_"),
    })
  );
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
