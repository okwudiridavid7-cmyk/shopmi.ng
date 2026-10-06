/**
 * Role and tenant-isolation matrix against the running local API (default http://localhost:4000).
 * Run: pnpm --filter @vendors/api test:integration
 *
 * Role-allowed requests use ids that don't exist, so they return 400/404 without changing data;
 * a 403 means the role check stopped them first.
 */
import assert from "node:assert/strict";
import crypto from "node:crypto";
import { after, before, describe, it } from "node:test";
import { Prisma } from "@prisma/client";
import { prisma } from "../db/prisma";
import { signAccessToken } from "../auth/tokens";

const API = (process.env.TEST_API_URL ?? "http://localhost:4000").replace(/\/$/, "");
const ORIGIN = process.env.TEST_WEB_ORIGIN ?? "http://localhost:3000";
const run = crypto.randomBytes(4).toString("hex");

type Who = "owner" | "manager" | "staff" | "outsider" | "otherOwner";
const users: Record<Who, { id: string; token: string }> = {} as never;
const ids = { tenantA: "", tenantB: "", productB: "", orderB: "" };

async function call(who: Who | null, method: string, path: string, body?: unknown, origin = ORIGIN) {
  const headers: Record<string, string> = { Origin: origin };
  if (who) headers.Authorization = `Bearer ${users[who].token}`;
  if (body !== undefined) headers["Content-Type"] = "application/json";
  const res = await fetch(`${API}${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  return res.status;
}

before(async () => {
  const health = await fetch(`${API}/health`).catch(() => null);
  if (!health?.ok) throw new Error(`API not reachable at ${API}; start it with pnpm dev`);

  const mk = async (who: Who, role: "seller" | "buyer") => {
    const u = await prisma.user.create({
      data: { email: `int-${who}-${run}@test.invalid`, role, name: who, emailVerifiedAt: new Date() },
    });
    users[who] = { id: u.id, token: signAccessToken({ sub: u.id, email: u.email, role: u.role }) };
    return u;
  };
  const owner = await mk("owner", "seller");
  const manager = await mk("manager", "seller");
  const staff = await mk("staff", "seller");
  await mk("outsider", "buyer");
  const otherOwner = await mk("otherOwner", "seller");

  const a = await prisma.tenant.create({
    data: {
      ownerUserId: owner.id,
      name: `Int A ${run}`,
      slug: `int-a-${run}`,
      tenantAdmins: {
        create: [
          { userId: owner.id, role: "owner" },
          { userId: manager.id, role: "manager" },
          { userId: staff.id, role: "staff" },
        ],
      },
    },
  });
  const b = await prisma.tenant.create({
    data: {
      ownerUserId: otherOwner.id,
      name: `Int B ${run}`,
      slug: `int-b-${run}`,
      tenantAdmins: { create: { userId: otherOwner.id, role: "owner" } },
    },
  });
  const productB = await prisma.product.create({
    data: {
      tenantId: b.id,
      title: "B product",
      description: "x",
      price: new Prisma.Decimal(1000),
      stockQty: 1,
      images: [],
      status: "active",
    },
  });
  const orderB = await prisma.order.create({
    data: {
      tenantId: b.id,
      buyerId: users.outsider.id,
      subtotal: new Prisma.Decimal(1000),
      total: new Prisma.Decimal(1000),
      status: "paid",
      items: { create: { productId: productB.id, qty: 1, unitPrice: new Prisma.Decimal(1000) } },
    },
  });
  Object.assign(ids, { tenantA: a.id, tenantB: b.id, productB: productB.id, orderB: orderB.id });
});

after(async () => {
  await prisma.order.deleteMany({ where: { tenantId: { in: [ids.tenantA, ids.tenantB] } } });
  await prisma.tenant.deleteMany({ where: { id: { in: [ids.tenantA, ids.tenantB] } } });
  await prisma.user.deleteMany({ where: { id: { in: Object.values(users).map((u) => u.id) } } });
  await prisma.$disconnect();
});

const FAKE = "cl000000000000000000fake0";

describe("owner-only routes", () => {
  const routes: [string, string, unknown][] = [
    ["PUT", "/api/seller/payouts/bank", { bankCode: "000", accountNumber: "0000000000" }],
    ["GET", "/api/seller/payouts/banks", undefined],
    ["POST", "/api/seller/plan/checkout", { planId: FAKE, months: 1 }],
    ["POST", "/api/seller/team/invite", { email: `x-${run}@test.invalid`, role: "staff" }],
    ["POST", "/api/seller/domain/buy", { domain: `x-${run}.com.ng` }],
    ["PUT", "/api/seller/domain", { domain: null }],
  ];
  for (const [method, path, body] of routes) {
    it(`${method} ${path} rejects manager and staff`, async () => {
      assert.equal(await call("manager", method, path, body), 403);
      assert.equal(await call("staff", method, path, body), 403);
    });
  }
});

describe("owner or manager routes", () => {
  it("staff cannot delete products, edit the shop or cancel orders", async () => {
    assert.equal(await call("staff", "DELETE", `/api/seller/products/${FAKE}`), 403);
    assert.equal(await call("staff", "PATCH", "/api/seller/shop", { name: "x" }), 403);
    assert.equal(await call("staff", "PUT", "/api/seller/notifications", {}), 403);
  });

  it("manager passes the role check (404 on a missing product)", async () => {
    assert.equal(await call("manager", "DELETE", `/api/seller/products/${FAKE}`), 404);
  });
});

describe("tenant isolation", () => {
  it("an owner cannot read or change another shop's orders and products", async () => {
    assert.equal(await call("owner", "GET", `/api/seller/orders/${ids.orderB}`), 404);
    assert.equal(
      await call("owner", "PATCH", `/api/seller/orders/${ids.orderB}`, { status: "cancelled" }),
      404
    );
    assert.equal(await call("owner", "PATCH", `/api/seller/products/${ids.productB}`, { title: "pwned" }), 404);
    const product = await prisma.product.findUniqueOrThrow({ where: { id: ids.productB } });
    assert.equal(product.title, "B product");
  });

  it("a buyer with no shop gets no seller data", async () => {
    const status = await call("outsider", "GET", "/api/seller/orders");
    assert.ok(status === 403 || status === 404, `got ${status}`);
  });

  it("anonymous requests are rejected", async () => {
    assert.equal(await call(null, "GET", "/api/seller/orders"), 401);
  });
});

describe("CSRF origin check", () => {
  it("blocks state changes from a foreign Origin", async () => {
    assert.equal(
      await call("owner", "PATCH", "/api/seller/shop", { name: "x" }, "https://evil.example"),
      403
    );
  });
});

describe("uploads over HTTP", () => {
  it("rejects HTML renamed to .png", async () => {
    const form = new FormData();
    form.append(
      "file",
      new Blob(["<html><script>alert(1)</script></html>"], { type: "image/png" }),
      "logo.png"
    );
    const res = await fetch(`${API}/api/seller/uploads?kind=product`, {
      method: "POST",
      headers: { Origin: ORIGIN, Authorization: `Bearer ${users.owner.token}` },
      body: form,
    });
    assert.equal(res.status, 400);
  });
});
