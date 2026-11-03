import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { z } from "zod";

/** Mirrors buyer POST /orders/:id/report body schema. */
const reportBody = z.object({
  message: z.string().min(10).max(5000),
  subject: z.string().min(3).max(160).optional(),
});

describe("report-a-problem body", () => {
  it("rejects short messages", () => {
    assert.throws(() => reportBody.parse({ message: "too short" }));
  });

  it("accepts a valid report payload", () => {
    const parsed = reportBody.parse({
      message: "Item arrived damaged and I need a replacement.",
      subject: "Damaged item",
    });
    assert.equal(parsed.subject, "Damaged item");
    assert.ok(parsed.message.length >= 10);
  });
});
