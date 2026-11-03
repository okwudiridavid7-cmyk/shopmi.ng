import assert from "node:assert/strict";
import { describe, it } from "node:test";

/** Mirrors seller PATCH /orders/:id fulfill payload shaping. */
function fulfillUpdate(body: {
  trackingNumber?: string | null;
  trackingCarrier?: string | null;
}) {
  return {
    status: "fulfilled" as const,
    trackingNumber: body.trackingNumber?.trim() || null,
    trackingCarrier: body.trackingCarrier?.trim() || null,
    shippedAt: new Date("2026-01-15T12:00:00.000Z"),
  };
}

describe("seller fulfill tracking fields", () => {
  it("stores trimmed tracking when provided", () => {
    const data = fulfillUpdate({
      trackingNumber: "  NG123  ",
      trackingCarrier: " GIG ",
    });
    assert.equal(data.trackingNumber, "NG123");
    assert.equal(data.trackingCarrier, "GIG");
    assert.equal(data.status, "fulfilled");
    assert.ok(data.shippedAt instanceof Date);
  });

  it("allows fulfill without tracking", () => {
    const data = fulfillUpdate({});
    assert.equal(data.trackingNumber, null);
    assert.equal(data.trackingCarrier, null);
  });
});
