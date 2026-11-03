import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { adminOrdersWhere } from "./adminOrderFilters";

describe("adminOrdersWhere", () => {
  it("filters by exact flag", () => {
    const where = adminOrdersWhere({ flag: "oversold" });
    assert.deepEqual(where, { flag: "oversold" });
  });

  it("needsAttention ORs flag and refund statuses", () => {
    const where = adminOrdersWhere({ needsAttention: true, flag: "ignored" });
    assert.ok(where.OR);
    assert.equal(Array.isArray(where.OR) && where.OR.length, 3);
    assert.equal(where.flag, undefined);
  });

  it("ignores invalid status values", () => {
    const where = adminOrdersWhere({ status: "not-a-status" });
    assert.equal(where.status, undefined);
  });

  it("accepts paid status and search q", () => {
    const where = adminOrdersWhere({ status: "paid", q: "ord_abc" });
    assert.equal(where.status, "paid");
    assert.ok(where.AND);
  });
});
