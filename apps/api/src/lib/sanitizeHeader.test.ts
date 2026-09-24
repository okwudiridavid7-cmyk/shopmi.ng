import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  HeaderInjectionError,
  sanitizeEmailSubject,
  sanitizeHeaderFragment,
} from "./sanitizeHeader";

describe("sanitizeEmailSubject (REM-03)", () => {
  it("accepts a normal subject", () => {
    assert.equal(sanitizeEmailSubject("Seller support · Opening a shop"), "Seller support · Opening a shop");
  });

  it("NFC-normalizes and trims", () => {
    assert.equal(sanitizeEmailSubject("  Hello  "), "Hello");
  });

  it("rejects CRLF injection attempts", () => {
    assert.throws(
      () => sanitizeEmailSubject("Hi\r\nBcc: victim@evil.test"),
      (err: unknown) =>
        err instanceof HeaderInjectionError && err.code === "INVALID_SUBJECT"
    );
  });

  it("rejects lone LF / CR / NUL / other controls", () => {
    assert.throws(() => sanitizeEmailSubject("bad\nline"));
    assert.throws(() => sanitizeEmailSubject("bad\rline"));
    assert.throws(() => sanitizeEmailSubject("bad\0null"));
    assert.throws(() => sanitizeEmailSubject("bad\x1bescape"));
  });

  it("rejects too-short and too-long subjects", () => {
    assert.throws(() => sanitizeEmailSubject("ab"));
    assert.throws(() => sanitizeEmailSubject("x".repeat(161)));
  });
});

describe("sanitizeHeaderFragment (REM-03 system parts)", () => {
  it("strips controls from app/shop name fragments", () => {
    assert.equal(sanitizeHeaderFragment("Shop\r\nName"), "ShopName");
  });

  it("truncates to max", () => {
    assert.equal(sanitizeHeaderFragment("abcdefghij", 5), "abcde");
  });
});
