import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { z } from "zod";

const planSlugSchema = z.string().min(1).max(64).optional();

/** Prefer an explicit active plan slug; otherwise fall back to default. */
export function pickOnboardingPlanSlug(
  requested: string | undefined,
  activeSlugs: string[],
  defaultSlug: string
): string {
  if (requested && activeSlugs.includes(requested)) return requested;
  return defaultSlug;
}

describe("onboarding ?plan= assignment", () => {
  it("accepts optional planSlug on the body schema", () => {
    assert.equal(planSlugSchema.parse(undefined), undefined);
    assert.equal(planSlugSchema.parse("yomi"), "yomi");
  });

  it("uses the requested slug when it is an active plan", () => {
    assert.equal(
      pickOnboardingPlanSlug("yomi", ["freemi", "yomi"], "yomi"),
      "yomi"
    );
  });

  it("falls back when slug is unknown or inactive", () => {
    assert.equal(
      pickOnboardingPlanSlug("nope", ["freemi", "yomi"], "yomi"),
      "yomi"
    );
    assert.equal(
      pickOnboardingPlanSlug(undefined, ["freemi", "yomi"], "yomi"),
      "yomi"
    );
  });
});
