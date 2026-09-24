import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  computeContactExpiresAt,
  expiredContactInquiryWhere,
  purgeExpiredContactInquiries,
  deleteContactInquiriesByEmail,
} from "./contactRetention";

describe("contactRetention (REM-16)", () => {
  it("computes expiresAt N days ahead (UTC)", () => {
    const from = new Date("2026-01-01T00:00:00.000Z");
    const expires = computeContactExpiresAt(from, 180);
    assert.equal(expires.toISOString(), "2026-06-30T00:00:00.000Z");
  });

  it("builds where for expiresAt and legacy createdAt cutoff", () => {
    const now = new Date("2026-09-24T00:00:00.000Z");
    const where = expiredContactInquiryWhere(now, 180);
    assert.ok(where.OR);
    assert.equal(where.OR?.length, 2);
  });

  it("purgeExpiredContactInquiries deletes via deps and logs", async () => {
    let deletedWhere: unknown = null;
    const result = await purgeExpiredContactInquiries({
      now: new Date("2026-09-24T00:00:00.000Z"),
      retentionDays: 180,
      deleteMany: async (where) => {
        deletedWhere = where;
        return { count: 3 };
      },
      writeLog: async (data) => {
        assert.equal(data.reason, "retention");
        assert.equal(data.deletedCount, 3);
        return { id: "log_1" };
      },
    });
    assert.deepEqual(result, { deletedCount: 3, logId: "log_1" });
    assert.ok(deletedWhere);
  });

  it("purge with zero matches still writes audit log", async () => {
    const result = await purgeExpiredContactInquiries({
      deleteMany: async () => ({ count: 0 }),
      writeLog: async (data) => {
        assert.equal(data.deletedCount, 0);
        return { id: "log_0" };
      },
    });
    assert.equal(result.deletedCount, 0);
    assert.equal(result.logId, "log_0");
  });

  it("deleteContactInquiriesByEmail normalizes email", async () => {
    let seen: string | null = null;
    const result = await deleteContactInquiriesByEmail(
      "  User@Example.COM ",
      "admin_1",
      {
        deleteMany: async (em) => {
          seen = em;
          return 2;
        },
        writeLog: async (data) => {
          assert.equal(data.reason, "admin_dsar");
          assert.equal(data.detail, "email=user@example.com");
          assert.equal(data.actorUserId, "admin_1");
          return { id: "log_dsar" };
        },
      }
    );
    assert.equal(seen, "user@example.com");
    assert.equal(result.deletedCount, 2);
  });
});
