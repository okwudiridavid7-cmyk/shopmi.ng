import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  CONTACT_PROMISES,
  CONTACT_SUCCESS_MESSAGE,
  CONTACT_CONFIRM_MESSAGE,
} from "./contact-copy";
import { platformPrivacyPolicy } from "./legal";

describe("REM-10 contact copy", () => {
  it("does not promise NDA or a fixed 12-hour SLA", () => {
    const blob = [...CONTACT_PROMISES, CONTACT_SUCCESS_MESSAGE].join("\n");
    assert.equal(/\bNDA\b/i.test(blob), false);
    assert.equal(/12\s*hours/i.test(blob), false);
  });

  it("acknowledges receipt (REM-15 async queue copy)", () => {
    assert.match(CONTACT_SUCCESS_MESSAGE, /received your message/i);
  });

  it("documents shop confirm-to-send copy (REM-17)", () => {
    assert.match(CONTACT_CONFIRM_MESSAGE, /confirm/i);
    assert.match(CONTACT_CONFIRM_MESSAGE, /shop/i);
  });
});

describe("REM-10 privacy policy copy", () => {
  it("does not claim a full automated GDPR rights portal", () => {
    const body = platformPrivacyPolicy(
      "Shopmi.ng",
      "https://shopmi.ng",
      "support@shopmi.ng"
    );
    assert.equal(/\bNDA\b/i.test(body), false);
    assert.equal(/12\s*hours/i.test(body), false);
    assert.match(body, /manually through/i);
    assert.equal(/\bportability\b/i.test(body), false);
  });

  it("documents contact inquiry retention and Resend (REM-16)", () => {
    const body = platformPrivacyPolicy(
      "Shopmi.ng",
      "https://shopmi.ng",
      "support@shopmi.ng"
    );
    assert.match(body, /180 days/i);
    assert.match(body, /Resend/i);
    assert.match(body, /contact form/i);
  });
});
