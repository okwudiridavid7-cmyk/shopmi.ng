import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  InvalidPhoneError,
  normalizeContactPhone,
} from "./contactPhone";

describe("normalizeContactPhone (REM-12)", () => {
  it("returns undefined for empty / whitespace", () => {
    assert.equal(normalizeContactPhone(undefined), undefined);
    assert.equal(normalizeContactPhone(null), undefined);
    assert.equal(normalizeContactPhone(""), undefined);
    assert.equal(normalizeContactPhone("   "), undefined);
  });

  it("accepts E.164", () => {
    assert.equal(normalizeContactPhone("+14155552671"), "+14155552671");
    assert.equal(normalizeContactPhone("+2348031234567"), "+2348031234567");
  });

  it("normalizes common NG local formats", () => {
    assert.equal(normalizeContactPhone("0803 123 4567"), "+2348031234567");
    assert.equal(normalizeContactPhone("(0701) 234-5678"), "+2347012345678");
    assert.equal(normalizeContactPhone("2348031234567"), "+2348031234567");
  });

  it("rejects junk / control / too-short values", () => {
    assert.throws(
      () => normalizeContactPhone("not-a-phone"),
      (err: unknown) =>
        err instanceof InvalidPhoneError && err.code === "INVALID_PHONE"
    );
    assert.throws(
      () => normalizeContactPhone("123"),
      (err: unknown) => err instanceof InvalidPhoneError
    );
    assert.throws(
      () => normalizeContactPhone("<script>"),
      (err: unknown) => err instanceof InvalidPhoneError
    );
  });
});
