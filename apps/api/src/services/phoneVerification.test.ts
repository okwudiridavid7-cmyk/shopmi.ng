import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { formatE164, generateOtpCode, hashOtp, toE164Digits } from "./whatsapp";

describe("WhatsApp phone OTP helpers", () => {
  it("normalises Nigerian mobiles", () => {
    assert.equal(toE164Digits("08031234567"), "2348031234567");
    assert.equal(formatE164("08031234567"), "+2348031234567");
    assert.equal(formatE164("bad"), null);
  });

  it("generates a 6-digit code and hashes stably", () => {
    const code = generateOtpCode();
    assert.match(code, /^\d{6}$/);
    assert.equal(hashOtp(code), hashOtp(code));
    assert.notEqual(hashOtp(code), hashOtp("000000"));
  });
});
