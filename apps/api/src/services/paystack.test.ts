import assert from "node:assert/strict";
import crypto from "node:crypto";
import { before, describe, it } from "node:test";

const SECRET = "sk_test_shopmi_signature_unit";
let ps: typeof import("./paystack");

before(async () => {
  // Set before the env module loads; dotenv never overrides existing values.
  process.env.PAYSTACK_SECRET_KEY = SECRET;
  ps = await import("./paystack");
});

function sign(body: Buffer) {
  return crypto.createHmac("sha512", SECRET).update(body).digest("hex");
}

describe("Paystack helpers", () => {
  it("accepts a valid HMAC-SHA512 signature", () => {
    const body = Buffer.from('{"event":"charge.success"}');
    assert.equal(ps.verifyPaystackSignature(body, sign(body)), true);
  });

  it("rejects a tampered body, short or missing signature", () => {
    const body = Buffer.from('{"event":"charge.success"}');
    const sig = sign(body);
    assert.equal(ps.verifyPaystackSignature(Buffer.from('{"event":"nope"}'), sig), false);
    assert.equal(ps.verifyPaystackSignature(body, sig.slice(0, 32)), false);
    assert.equal(ps.verifyPaystackSignature(body, undefined), false);
  });

  it("parses charge events and rejects fractional amounts", () => {
    assert.deepEqual(
      ps.chargeFromEvent({ reference: "ord_abc", status: "success", amount: 50000, currency: "ngn" }),
      { reference: "ord_abc", status: "success", amount: 50000, currency: "NGN" }
    );
    assert.equal(ps.chargeFromEvent({ reference: "x", status: "success", amount: 12.5 }), null);
    assert.equal(ps.chargeFromEvent(null), null);
  });

  it("converts to minor units and builds unguessable references", () => {
    assert.equal(ps.toMinorUnits(12.34), 1234);
    assert.match(ps.newReference("ord_"), /^ord_[0-9a-f]{24}$/);
    assert.notEqual(ps.newReference("pln_"), ps.newReference("pln_"));
  });
});
