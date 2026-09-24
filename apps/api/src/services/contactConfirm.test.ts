import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { ContactInquiry } from "@prisma/client";
import {
  confirmShopContactInquiry,
  hashConfirmToken,
  mintConfirmToken,
} from "./contactConfirm";

function baseInquiry(
  overrides: Partial<ContactInquiry> = {}
): ContactInquiry {
  const token = mintConfirmToken();
  return {
    id: "inq_1",
    scope: "shop",
    tenantId: null,
    slug: "acme",
    name: "Ada",
    email: "ada@example.com",
    phone: null,
    subject: "Hello there",
    message: "This is a long enough message.",
    ipHash: null,
    userAgent: null,
    idempotencyKey: null,
    status: "awaiting_confirm",
    providerMessageId: null,
    error: null,
    recipientEmail: "shop@example.com",
    confirmTokenHash: token.hash,
    confirmTokenExpires: token.expiresAt,
    expiresAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

describe("confirmShopContactInquiry (REM-17)", () => {
  it("rejects missing / short tokens without enqueue", async () => {
    let enqueued = 0;
    const result = await confirmShopContactInquiry("short", {
      enqueue: async () => {
        enqueued += 1;
      },
      findByHash: async () => null,
    });
    assert.equal(result.ok, false);
    if (!result.ok) assert.equal(result.code, "INVALID_TOKEN");
    assert.equal(enqueued, 0);
  });

  it("enqueues shop mail only after confirm", async () => {
    const minted = mintConfirmToken();
    const inquiry = baseInquiry({
      confirmTokenHash: minted.hash,
      confirmTokenExpires: minted.expiresAt,
    });
    let enqueued = 0;
    let updatedStatus: string | null = null;
    const result = await confirmShopContactInquiry(minted.raw, {
      findByHash: async (h) => (h === minted.hash ? inquiry : null),
      updateInquiry: async (_id, data) => {
        updatedStatus = String(data.status ?? "");
      },
      buildNotifyMail: async ({ shopName }) => ({
        html: `<p>${shopName}</p>`,
        subject: `[${shopName}] Hello there`,
      }),
      enqueue: async (payload) => {
        enqueued += 1;
        assert.equal(payload.to, "shop@example.com");
        assert.equal(payload.replyTo, "ada@example.com");
        assert.equal(payload.inquiryId, "inq_1");
      },
    });
    assert.equal(result.ok, true);
    if (result.ok) {
      assert.equal(result.status, "queued");
      assert.equal(result.replay, false);
    }
    assert.equal(enqueued, 1);
    assert.equal(updatedStatus, "queued");
  });

  it("does not enqueue while still awaiting_confirm (invalid token path)", async () => {
    let enqueued = 0;
    await confirmShopContactInquiry("z".repeat(32), {
      findByHash: async () => null,
      enqueue: async () => {
        enqueued += 1;
      },
    });
    assert.equal(enqueued, 0);
  });

  it("skips enqueue for already queued/sent (replay)", async () => {
    let enqueued = 0;
    const result = await confirmShopContactInquiry("a".repeat(32), {
      findByHash: async () =>
        baseInquiry({
          status: "queued",
          confirmTokenHash: hashConfirmToken("a".repeat(32)),
        }),
      enqueue: async () => {
        enqueued += 1;
      },
    });
    assert.equal(result.ok, true);
    if (result.ok) {
      assert.equal(result.status, "queued");
      assert.equal(result.replay, true);
    }
    assert.equal(enqueued, 0);
  });

  it("rejects expired tokens without enqueue", async () => {
    const minted = mintConfirmToken();
    let enqueued = 0;
    const result = await confirmShopContactInquiry(minted.raw, {
      now: new Date(Date.now() + 99 * 60 * 60 * 1000),
      findByHash: async () =>
        baseInquiry({
          confirmTokenHash: minted.hash,
          confirmTokenExpires: minted.expiresAt,
        }),
      enqueue: async () => {
        enqueued += 1;
      },
    });
    assert.equal(result.ok, false);
    if (!result.ok) assert.equal(result.code, "EXPIRED");
    assert.equal(enqueued, 0);
  });
});
