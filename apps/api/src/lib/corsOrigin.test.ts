import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { isCorsOriginAllowed, parseAllowedOrigins } from "./corsOrigin";

const prodBase = {
  isProd: true,
  webUrl: "https://shopmi.ng",
  shopBaseDomain: "shops.shopmi.ng",
};

const devBase = {
  isProd: false,
  webUrl: "http://localhost:3000",
  shopBaseDomain: "localhost:3000",
};

describe("isCorsOriginAllowed (REM-05)", () => {
  it("allows missing Origin", () => {
    assert.equal(isCorsOriginAllowed(undefined, prodBase), true);
  });

  it("allows WEB_URL origin in production", () => {
    assert.equal(isCorsOriginAllowed("https://shopmi.ng", prodBase), true);
  });

  it("allows shop subdomain under shopBaseDomain in production", () => {
    assert.equal(
      isCorsOriginAllowed("https://acme.shops.shopmi.ng", prodBase),
      true
    );
  });

  it("rejects localhost in production", () => {
    assert.equal(isCorsOriginAllowed("http://localhost:3000", prodBase), false);
    assert.equal(isCorsOriginAllowed("http://127.0.0.1:3000", prodBase), false);
  });

  it("rejects lvh.me in production", () => {
    assert.equal(isCorsOriginAllowed("http://lvh.me:3000", prodBase), false);
    assert.equal(
      isCorsOriginAllowed("http://shop.lvh.me:3000", prodBase),
      false
    );
  });

  it("allows localhost and lvh.me in non-production", () => {
    assert.equal(isCorsOriginAllowed("http://localhost:3000", devBase), true);
    assert.equal(isCorsOriginAllowed("http://127.0.0.1:3000", devBase), true);
    assert.equal(isCorsOriginAllowed("http://lvh.me:3000", devBase), true);
    assert.equal(isCorsOriginAllowed("http://acme.lvh.me:3000", devBase), true);
  });

  it("allows ALLOWED_ORIGINS extras in production", () => {
    assert.equal(
      isCorsOriginAllowed("https://preview.example.com", {
        ...prodBase,
        allowedOrigins: ["https://preview.example.com"],
      }),
      true
    );
  });

  it("rejects unrelated origins in production", () => {
    assert.equal(
      isCorsOriginAllowed("https://evil.example", prodBase),
      false
    );
  });
});

describe("parseAllowedOrigins", () => {
  it("splits and trims", () => {
    assert.deepEqual(parseAllowedOrigins(" https://a.test ,https://b.test "), [
      "https://a.test",
      "https://b.test",
    ]);
  });
});
