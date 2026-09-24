import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  CaptchaError,
  isCaptchaRequired,
  verifyTurnstileToken,
} from "./turnstile";

describe("isCaptchaRequired (REM-14)", () => {
  it("is required in production even without secret", () => {
    assert.equal(
      isCaptchaRequired({ isProd: true, secret: "", bypass: false }),
      true
    );
  });

  it("is optional in non-prod without secret", () => {
    assert.equal(
      isCaptchaRequired({ isProd: false, secret: "", bypass: false }),
      false
    );
  });

  it("is required in non-prod when secret is set", () => {
    assert.equal(
      isCaptchaRequired({
        isProd: false,
        secret: "test-secret",
        bypass: false,
      }),
      true
    );
  });

  it("honors bypass outside production", () => {
    assert.equal(
      isCaptchaRequired({
        isProd: false,
        secret: "test-secret",
        bypass: true,
      }),
      false
    );
  });

  it("ignores bypass in production", () => {
    assert.equal(
      isCaptchaRequired({
        isProd: true,
        secret: "test-secret",
        bypass: true,
      }),
      true
    );
  });
});

describe("verifyTurnstileToken (REM-14)", () => {
  it("no-ops when captcha not required", async () => {
    await verifyTurnstileToken(undefined, null, {
      isProd: false,
      secret: "",
      bypass: false,
    });
  });

  it("fails closed in prod without secret", async () => {
    await assert.rejects(
      () =>
        verifyTurnstileToken("tok", "1.1.1.1", {
          isProd: true,
          secret: "",
        }),
      (err: unknown) =>
        err instanceof CaptchaError && err.code === "CAPTCHA_UNAVAILABLE"
    );
  });

  it("requires token when captcha is on", async () => {
    await assert.rejects(
      () =>
        verifyTurnstileToken("", "1.1.1.1", {
          isProd: false,
          secret: "sec",
        }),
      (err: unknown) =>
        err instanceof CaptchaError && err.code === "CAPTCHA_REQUIRED"
    );
  });

  it("rejects invalid token from siteverify", async () => {
    await assert.rejects(
      () =>
        verifyTurnstileToken("bad", "1.1.1.1", {
          isProd: false,
          secret: "sec",
          fetchFn: async () =>
            new Response(JSON.stringify({ success: false }), { status: 200 }),
        }),
      (err: unknown) =>
        err instanceof CaptchaError && err.code === "CAPTCHA_FAILED"
    );
  });

  it("accepts valid token", async () => {
    await verifyTurnstileToken("good", "1.1.1.1", {
      isProd: false,
      secret: "sec",
      fetchFn: async () =>
        new Response(JSON.stringify({ success: true }), { status: 200 }),
    });
  });
});
