import assert from "node:assert/strict";
import crypto from "node:crypto";
import { before, describe, it } from "node:test";

const SECRET = "wa_secret_for_tests";
let wa: typeof import("./whatsapp");

before(async () => {
  process.env.WHATSAPP_APP_SECRET = SECRET;
  wa = await import("./whatsapp");
});

describe("WhatsApp numbers and webhook signature", () => {
  it("normalises Nigerian mobiles to E.164 digits", () => {
    assert.equal(wa.toE164Digits("08031234567"), "2348031234567");
    assert.equal(wa.toE164Digits("+234 803 123 4567"), "2348031234567");
    assert.equal(wa.toE164Digits("8031234567"), "2348031234567");
    assert.equal(wa.toE164Digits("not-a-phone"), "");
    assert.equal(wa.toE164Digits("123"), "");
  });

  it("verifies X-Hub-Signature-256", () => {
    const body = Buffer.from('{"object":"whatsapp_business_account"}');
    const hex = crypto.createHmac("sha256", SECRET).update(body).digest("hex");
    assert.equal(wa.verifyWhatsAppSignature(body, `sha256=${hex}`), true);
    assert.equal(wa.verifyWhatsAppSignature(body, `sha256=${hex.slice(0, 10)}`), false);
    assert.equal(wa.verifyWhatsAppSignature(Buffer.from("{}"), `sha256=${hex}`), false);
    assert.equal(wa.verifyWhatsAppSignature(body, undefined), false);
  });
});
