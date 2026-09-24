import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  MailConfigError,
  MailProviderError,
  sendHtmlEmail,
} from "./mail";

const baseOpts = {
  to: "support@example.com",
  subject: "Hello subject",
  html: "<p>Hi</p>",
};

describe("sendHtmlEmail (REM-01 / REM-09)", () => {
  it("throws MailConfigError when not configured", async () => {
    await assert.rejects(
      () => sendHtmlEmail(baseOpts, { configured: false }),
      (err: unknown) =>
        err instanceof MailConfigError && err.code === "MAIL_UNAVAILABLE"
    );
  });

  it("throws MailProviderError when Resend returns error", async () => {
    await assert.rejects(
      () =>
        sendHtmlEmail(baseOpts, {
          configured: true,
          send: async () => ({
            data: null,
            error: { message: "rate limited" },
          }),
        }),
      (err: unknown) =>
        err instanceof MailProviderError && err.code === "MAIL_REJECTED"
    );
  });

  it("returns providerMessageId on success", async () => {
    const result = await sendHtmlEmail(baseOpts, {
      configured: true,
      send: async () => ({
        data: { id: "msg_123" },
        error: null,
      }),
    });
    assert.equal(result.providerMessageId, "msg_123");
  });

  it("forwards replyTo to the provider (REM-12)", async () => {
    let seen: { replyTo?: string } | null = null;
    await sendHtmlEmail(
      { ...baseOpts, replyTo: "visitor@example.com" },
      {
        configured: true,
        send: async (payload) => {
          seen = payload;
          return { data: { id: "msg_rt" }, error: null };
        },
      }
    );
    assert.equal(seen?.replyTo, "visitor@example.com");
  });

  it("times out slow sends", async () => {
    await assert.rejects(
      () =>
        sendHtmlEmail(baseOpts, {
          configured: true,
          timeoutMs: 30,
          send: async () =>
            new Promise((resolve) => {
              setTimeout(
                () => resolve({ data: { id: "late" }, error: null }),
                500
              );
            }),
        }),
      (err: unknown) =>
        err instanceof MailProviderError && /timed out/i.test(err.message)
    );
  });
});
