import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  isShopContactFormEnabled,
  resolveShopContactRecipient,
} from "./shopContact";

describe("resolveShopContactRecipient (REM-08)", () => {
  it("prefers tenant.email when valid", () => {
    assert.equal(
      resolveShopContactRecipient({
        tenantEmail: "shop@example.com",
        theme: { contactEmail: "theme@example.com" },
      }),
      "shop@example.com"
    );
  });

  it("falls back to theme.contactEmail when tenant email missing", () => {
    assert.equal(
      resolveShopContactRecipient({
        tenantEmail: null,
        theme: { contactEmail: "theme@example.com" },
      }),
      "theme@example.com"
    );
  });

  it("returns null when no valid email (no platform fallback)", () => {
    assert.equal(
      resolveShopContactRecipient({
        tenantEmail: "",
        theme: { contactEmail: "not-an-email" },
      }),
      null
    );
    assert.equal(
      resolveShopContactRecipient({
        tenantEmail: null,
        theme: {},
      }),
      null
    );
  });

  it("rejects malformed tenant email and tries theme", () => {
    assert.equal(
      resolveShopContactRecipient({
        tenantEmail: "nope",
        theme: { contactEmail: "ok@example.com" },
      }),
      "ok@example.com"
    );
  });
});

describe("isShopContactFormEnabled (REM-08)", () => {
  it("defaults to enabled", () => {
    assert.equal(isShopContactFormEnabled({}), true);
  });

  it("respects explicit false", () => {
    assert.equal(isShopContactFormEnabled({ contactFormEnabled: false }), false);
  });

  it("treats true as enabled", () => {
    assert.equal(isShopContactFormEnabled({ contactFormEnabled: true }), true);
  });
});
