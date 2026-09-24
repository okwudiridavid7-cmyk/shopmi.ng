import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { MailProviderError } from "../services/mailErrors";
import { processContactMailJob } from "./processContactMail";

const baseJob = {
  inquiryId: "inq_1",
  to: "support@example.com",
  subject: "Hello",
  html: "<p>Hi</p>",
  replyTo: "visitor@example.com",
};

describe("processContactMailJob (REM-15 at-most-once)", () => {
  it("skips when providerMessageId is already set (no double-send)", async () => {
    let sends = 0;
    const result = await processContactMailJob(baseJob, {
      findInquiry: async () => ({
        id: "inq_1",
        status: "failed",
        providerMessageId: "msg_already",
      }),
      send: async () => {
        sends += 1;
        return { providerMessageId: "msg_new" };
      },
    });
    assert.deepEqual(result, {
      outcome: "skipped",
      reason: "already_sent",
    });
    assert.equal(sends, 0);
  });

  it("skips when status is already sent", async () => {
    let sends = 0;
    const result = await processContactMailJob(baseJob, {
      findInquiry: async () => ({
        id: "inq_1",
        status: "sent",
        providerMessageId: null,
      }),
      send: async () => {
        sends += 1;
        return { providerMessageId: "msg_x" };
      },
    });
    assert.equal(result.outcome, "skipped");
    assert.equal(sends, 0);
  });

  it("sends once for queued inquiries and marks sent", async () => {
    let marked: { id: string; providerMessageId: string | null } | null =
      null;
    let seenIdempotency: string | undefined;
    const result = await processContactMailJob(baseJob, {
      findInquiry: async () => ({
        id: "inq_1",
        status: "queued",
        providerMessageId: null,
      }),
      markSent: async (id, providerMessageId) => {
        marked = { id, providerMessageId };
      },
      send: async (opts) => {
        seenIdempotency = opts.idempotencyKey;
        return { providerMessageId: "msg_ok" };
      },
    });
    assert.deepEqual(result, {
      outcome: "sent",
      providerMessageId: "msg_ok",
    });
    assert.deepEqual(marked, { id: "inq_1", providerMessageId: "msg_ok" });
    assert.equal(seenIdempotency, "inq_1");
  });

  it("retries failed inquiries without providerMessageId", async () => {
    let sends = 0;
    await processContactMailJob(baseJob, {
      findInquiry: async () => ({
        id: "inq_1",
        status: "failed",
        providerMessageId: null,
      }),
      markSent: async () => {},
      send: async () => {
        sends += 1;
        return { providerMessageId: "msg_retry" };
      },
    });
    assert.equal(sends, 1);
  });

  it("skips awaiting_confirm (REM-17 — unconfirmed never emails shop)", async () => {
    let sends = 0;
    const result = await processContactMailJob(baseJob, {
      findInquiry: async () => ({
        id: "inq_1",
        status: "awaiting_confirm",
        providerMessageId: null,
      }),
      send: async () => {
        sends += 1;
        return { providerMessageId: "msg_x" };
      },
    });
    assert.deepEqual(result, {
      outcome: "skipped",
      reason: "not_retryable",
    });
    assert.equal(sends, 0);
  });
});
