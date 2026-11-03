/**
 * Buyer report-a-problem → ContactInquiry with orderId.
 * Run: pnpm --filter @vendors/api test:integration
 */
import assert from "node:assert/strict";
import crypto from "node:crypto";
import { after, before, describe, it } from "node:test";
import { Prisma } from "@prisma/client";
import { prisma } from "../db/prisma";
import { computeContactExpiresAt } from "../services/contactRetention";

const run = crypto.randomBytes(4).toString("hex");
const ids = { buyer: "", tenant: "", order: "", inquiry: "" };

before(async () => {
  const seller = await prisma.user.create({
    data: { email: `rep-seller-${run}@test.invalid`, role: "seller", name: "Rep Seller" },
  });
  const buyer = await prisma.user.create({
    data: { email: `rep-buyer-${run}@test.invalid`, role: "buyer", name: "Rep Buyer" },
  });
  const plan = await prisma.plan.findFirstOrThrow({ where: { slug: "yomi" } });
  const tenant = await prisma.tenant.create({
    data: {
      ownerUserId: seller.id,
      name: `Rep Shop ${run}`,
      slug: `rep-shop-${run}`,
      planId: plan.id,
      tenantAdmins: { create: { userId: seller.id, role: "owner" } },
    },
  });
  const product = await prisma.product.create({
    data: {
      tenantId: tenant.id,
      title: "Rep product",
      description: "x",
      price: new Prisma.Decimal(1000),
      stockQty: 1,
      images: [],
      status: "active",
    },
  });
  const order = await prisma.order.create({
    data: {
      tenantId: tenant.id,
      buyerId: buyer.id,
      status: "paid",
      subtotal: 1000,
      total: 1000,
      currency: "NGN",
      items: {
        create: [{ productId: product.id, qty: 1, unitPrice: 1000 }],
      },
    },
  });
  Object.assign(ids, { buyer: buyer.id, tenant: tenant.id, order: order.id });
});

after(async () => {
  await prisma.contactInquiry.deleteMany({ where: { orderId: ids.order } });
  await prisma.orderItem.deleteMany({ where: { orderId: ids.order } });
  await prisma.order.deleteMany({ where: { id: ids.order } });
  await prisma.product.deleteMany({ where: { tenantId: ids.tenant } });
  await prisma.tenantAdmin.deleteMany({ where: { tenantId: ids.tenant } });
  await prisma.tenant.deleteMany({ where: { id: ids.tenant } });
  await prisma.user.deleteMany({
    where: { email: { in: [`rep-seller-${run}@test.invalid`, `rep-buyer-${run}@test.invalid`] } },
  });
});

describe("report-a-problem inquiry", () => {
  it("creates a ContactInquiry linked to the order", async () => {
    const buyer = await prisma.user.findUniqueOrThrow({ where: { id: ids.buyer } });
    const order = await prisma.order.findUniqueOrThrow({
      where: { id: ids.order },
      include: { tenant: { select: { id: true, name: true, slug: true } } },
    });
    const inquiry = await prisma.contactInquiry.create({
      data: {
        scope: "platform",
        tenantId: order.tenantId,
        slug: order.tenant.slug,
        orderId: order.id,
        name: buyer.name || buyer.email,
        email: buyer.email,
        subject: `Order problem · ${order.tenant.name}`,
        message: "Item arrived damaged and I need help.",
        status: "received",
        expiresAt: computeContactExpiresAt(),
      },
    });
    ids.inquiry = inquiry.id;
    assert.equal(inquiry.orderId, order.id);
    assert.match(inquiry.message, /damaged/i);
  });
});
