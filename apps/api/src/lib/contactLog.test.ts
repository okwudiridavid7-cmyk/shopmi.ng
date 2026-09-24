import assert from "node:assert/strict";
import { describe, it, beforeEach } from "node:test";
import {
  getContactMetric,
  logContactEvent,
  newContactRequestId,
  resetContactMetrics,
} from "./contactLog";

describe("contactLog (REM-11)", () => {
  beforeEach(() => resetContactMetrics());

  it("emits metrics counters by outcome", () => {
    logContactEvent({
      requestId: "abc",
      route: "platform",
      outcome: "sent",
      latencyMs: 12,
      inquiryId: "inq_1",
    });
    logContactEvent({
      requestId: "def",
      route: "shop",
      slug: "acme",
      outcome: "failed",
      latencyMs: 40,
      code: "MAIL_UNAVAILABLE",
    });
    assert.equal(getContactMetric("contact.sent"), 1);
    assert.equal(getContactMetric("contact.failed"), 1);
    assert.equal(getContactMetric("contact.code.MAIL_UNAVAILABLE"), 1);
  });

  it("generates opaque request ids", () => {
    const a = newContactRequestId();
    const b = newContactRequestId();
    assert.equal(a.length, 16);
    assert.notEqual(a, b);
  });
});
