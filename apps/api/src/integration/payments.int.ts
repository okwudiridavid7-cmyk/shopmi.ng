/**
 * Payment integration tests against the local database. Paystack is stubbed at fetch level.
 * Run: pnpm --filter @vendors/api test:integration
 */
import assert from "node:assert/strict";
import crypto from "node:crypto";
import { after, before, beforeEach, describe, it } from "node:test";
import { Prisma } from "@prisma/client";
import { prisma } from "../db/prisma";
import { applyOrderCharge, cancelPaidOrder, RefundError } from "../services/orders";
import { applyPlanCharge } from "../services/planBilling";
import { fulfillDomainPayment } from "../services/domains";
import { newReference } from "../services/paystack";

const run = crypto.randomBytes(4).toString("hex");
const realFetch = globalThis.fetch;
let refundCalls: string[] = [];
let refundFails = false;

function stubPaystack() {
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input instanceof Request ? input.url : input);
    if (url.startsWith("https://api.paystack.co/refund")) {
      const body = JSON.parse(String(init?.body ?? "{}")) as { transaction?: string };
      refundCalls.push(body.transaction ?? "");
      if (refundFails) {
        return new Response(JSON.stringify({ status: false, message: "Refund not allowed" }), {
          status: 400,
        });
      }
      return new Response(JSON.stringify({ status: true, message: "ok", data: { status: "pending" } }), {
        status: 200,
      });
    }
    if (url.startsWith("https://api.paystack.co/")) {
      return new Response(JSON.stringify({ status: false, message: "not stubbed" }), { status: 400 });
    }
    return realFetch(input, init);
  }) as typeof fetch;
}

const ids = { seller: "", buyer: "", tenant: "", product: "", plan: "" };

before(async () => {
  stubPaystack();
  const seller = await prisma.user.create({
    data: { email: `int-seller-${run}@test.invalid`, role: "seller", name: "Int Seller" },
  });
  const buyer = await prisma.user.create({
    data: { email: `int-buyer-${run}@test.invalid`, role: "buyer", name: "Int Buyer" },
  });
  const plan = await prisma.plan.findFirstOrThrow({ where: { slug: "yomi" } });
  const tenant = await prisma.tenant.create({
    data: {
      ownerUserId: seller.id,
      name: `Int Shop ${run}`,
      slug: `int-shop-${run}`,
      planId: plan.id,
      tenantAdmins: { create: { userId: seller.id, role: "owner" } },
    },
  });
  const product = await prisma.product.create({
    data: {
      tenantId: tenant.id,
      title: "Int product",
      description: "Integration test product",
      price: new Prisma.Decimal(5000),
      stockQty: 3,
      images: [],
      status: "active",
    },
  });
  Object.assign(ids, { seller: seller.id, buyer: buyer.id, tenant: tenant.id, product: product.id, plan: plan.id });
});

after(async () => {
  globalThis.fetch = realFetch;
  await prisma.order.deleteMany({ where: { tenantId: ids.tenant } });
  await prisma.planPayment.deleteMany({ where: { tenantId: ids.tenant } });
  const rows = await prisma.registeredDomain.findMany({ where: { domain: { endsWith: `-${run}.com.ng` } } });
  await prisma.domainPayment.deleteMany({ where: { registeredDomainId: { in: rows.map((r) => r.id) } } });
  await prisma.registeredDomain.deleteMany({ where: { id: { in: rows.map((r) => r.id) } } });
  await prisma.tenant.deleteMany({ where: { id: ids.tenant } });
  await prisma.user.deleteMany({ where: { id: { in: [ids.seller, ids.buyer] } } });
  await prisma.$disconnect();
});

beforeEach(() => {
  refundCalls = [];
  refundFails = false;
});

async function makeOrder(qty = 1, total = 5000) {
  const reference = newReference("ord_");
  const order = await prisma.order.create({
    data: {
      tenantId: ids.tenant,
      buyerId: ids.buyer,
      subtotal: new Prisma.Decimal(total),
      total: new Prisma.Decimal(total),
      currency: "NGN",
      paystackReference: reference,
      serviceFee: new Prisma.Decimal(0),
      items: { create: { productId: ids.product, qty, unitPrice: new Prisma.Decimal(total / qty) } },
    },
  });
  return { order, reference };
}

const stock = async () =>
  (await prisma.product.findUniqueOrThrow({ where: { id: ids.product } })).stockQty;

describe("order webhook", () => {
  it("fulfils exactly once under concurrent webhook + callback", async () => {
    const before = await stock();
    const { order, reference } = await makeOrder();
    const charge = { reference, status: "success", amount: 500000, currency: "NGN" };
    const outcomes = await Promise.all(Array.from({ length: 5 }, () => applyOrderCharge(charge)));
    assert.equal(outcomes.filter((o) => o === "fulfilled").length, 1);
    assert.equal(await stock(), before - 1);
    const sales = await prisma.sellerLedgerEntry.count({ where: { orderId: order.id, kind: "sale" } });
    assert.equal(sales, 1);
  });

  it("flags and does not fulfil on amount or currency mismatch", async () => {
    const { order, reference } = await makeOrder();
    assert.equal(
      await applyOrderCharge({ reference, status: "success", amount: 100, currency: "NGN" }),
      "flagged"
    );
    assert.equal(
      await applyOrderCharge({ reference, status: "success", amount: 500000, currency: "USD" }),
      "flagged"
    );
    const row = await prisma.order.findUniqueOrThrow({ where: { id: order.id } });
    assert.equal(row.status, "pending_payment");
    assert.equal(row.flag, "amount_mismatch");
  });

  it("returns unknown for references it never issued", async () => {
    assert.equal(
      await applyOrderCharge({ reference: "ord_doesnotexist", status: "success", amount: 1, currency: "NGN" }),
      "unknown"
    );
  });

  it("never drives stock negative and flags the oversell", async () => {
    await prisma.product.update({ where: { id: ids.product }, data: { stockQty: 1 } });
    const { order, reference } = await makeOrder(2, 10000);
    await applyOrderCharge({ reference, status: "success", amount: 1000000, currency: "NGN" });
    assert.equal(await stock(), 0);
    const row = await prisma.order.findUniqueOrThrow({ where: { id: order.id } });
    assert.equal(row.flag, "oversold");
    await prisma.product.update({ where: { id: ids.product }, data: { stockQty: 3 } });
  });
});

describe("refunds", () => {
  it("cancelling a paid order refunds, restores stock and reverses the ledger", async () => {
    const { order, reference } = await makeOrder();
    await applyOrderCharge({ reference, status: "success", amount: 500000, currency: "NGN" });
    const afterSale = await stock();
    await cancelPaidOrder(order.id, ids.tenant);
    assert.deepEqual(refundCalls, [reference]);
    assert.equal(await stock(), afterSale + 1);
    const row = await prisma.order.findUniqueOrThrow({ where: { id: order.id } });
    assert.equal(row.status, "cancelled");
    assert.equal(row.refundStatus, "pending");
    const refund = await prisma.sellerLedgerEntry.findFirst({ where: { orderId: order.id, kind: "refund" } });
    assert.equal(Number(refund?.amount), -5000);
  });

  it("keeps the order paid when Paystack refuses the refund", async () => {
    const { order, reference } = await makeOrder();
    await applyOrderCharge({ reference, status: "success", amount: 500000, currency: "NGN" });
    refundFails = true;
    await assert.rejects(() => cancelPaidOrder(order.id, ids.tenant), RefundError);
    const row = await prisma.order.findUniqueOrThrow({ where: { id: order.id } });
    assert.equal(row.status, "paid");
    assert.equal(row.refundStatus, null);
  });

  it("cannot cancel another shop's order", async () => {
    const { order, reference } = await makeOrder();
    await applyOrderCharge({ reference, status: "success", amount: 500000, currency: "NGN" });
    await assert.rejects(() => cancelPaidOrder(order.id, "some-other-tenant"), (e: unknown) => {
      return e instanceof RefundError && e.status === 404;
    });
  });
});

describe("plan purchase", () => {
  it("activates once and ignores a mismatched amount", async () => {
    const reference = newReference("pln_");
    await prisma.planPayment.create({
      data: {
        tenantId: ids.tenant,
        planId: ids.plan,
        months: 6,
        amount: new Prisma.Decimal(15300),
        reference,
        createdById: ids.seller,
      },
    });
    assert.equal(
      await applyPlanCharge({ reference, status: "success", amount: 100, currency: "NGN" }),
      "flagged"
    );
    const results = await Promise.all([
      applyPlanCharge({ reference, status: "success", amount: 1530000, currency: "NGN" }),
      applyPlanCharge({ reference, status: "success", amount: 1530000, currency: "NGN" }),
    ]);
    assert.equal(results.filter((r) => r === "activated").length, 1);
    const tenant = await prisma.tenant.findUniqueOrThrow({ where: { id: ids.tenant } });
    assert.ok(tenant.planExpiresAt && tenant.planExpiresAt.getTime() > Date.now() + 150 * 86400_000);
    assert.equal(tenant.trialEndsAt, null);
  });
});

describe("domain purchase", () => {
  it("refunds a late payment for a domain another shop now holds", async () => {
    const other = await prisma.tenant.findFirstOrThrow({ where: { NOT: { id: ids.tenant } } });
    const row = await prisma.registeredDomain.create({
      data: { tenantId: other.id, domain: `late-${run}.com.ng`, tld: "com.ng", status: "pending_payment", contact: {} },
    });
    const reference = newReference("dom_");
    await prisma.domainPayment.create({
      data: {
        registeredDomainId: row.id,
        tenantId: ids.tenant,
        kind: "register",
        years: 1,
        amount: new Prisma.Decimal(5000),
        paystackReference: reference,
        status: "expired",
      },
    });
    assert.equal(await fulfillDomainPayment(reference, 500000, "NGN"), false);
    assert.deepEqual(refundCalls, [reference]);
    const payment = await prisma.domainPayment.findUniqueOrThrow({ where: { paystackReference: reference } });
    assert.equal(payment.status, "refunded");
    const after = await prisma.registeredDomain.findUniqueOrThrow({ where: { id: row.id } });
    assert.equal(after.tenantId, other.id);
    assert.equal(after.status, "pending_payment");
  });

  it("does not register on an underpayment", async () => {
    const row = await prisma.registeredDomain.create({
      data: { tenantId: ids.tenant, domain: `under-${run}.com.ng`, tld: "com.ng", status: "pending_payment", contact: {} },
    });
    const reference = newReference("dom_");
    await prisma.domainPayment.create({
      data: {
        registeredDomainId: row.id,
        tenantId: ids.tenant,
        kind: "register",
        years: 1,
        amount: new Prisma.Decimal(5000),
        paystackReference: reference,
      },
    });
    assert.equal(await fulfillDomainPayment(reference, 100, "NGN"), false);
    const after = await prisma.registeredDomain.findUniqueOrThrow({ where: { id: row.id } });
    assert.equal(after.status, "pending_payment");
  });
});
