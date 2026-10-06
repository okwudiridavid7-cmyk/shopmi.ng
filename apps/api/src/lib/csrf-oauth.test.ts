import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { safeLocalPath } from "../auth/oauthState";
import { requireTrustedOrigin } from "../lib/originCheck";
import type { Request, Response } from "express";

describe("safeLocalPath (open redirect)", () => {
  it("allows ordinary relative paths", () => {
    assert.equal(safeLocalPath("/seller/plan"), "/seller/plan");
    assert.equal(safeLocalPath("/buyer/orders?x=1"), "/buyer/orders?x=1");
  });

  it("rejects protocol-relative and backslash tricks", () => {
    assert.equal(safeLocalPath("//evil.com"), null);
    assert.equal(safeLocalPath("/\\evil.com"), null);
    assert.equal(safeLocalPath("https://evil.com"), null);
    assert.equal(safeLocalPath(null), null);
  });
});

function mockRes() {
  const statusCode = { n: 200 };
  const body: { json?: unknown } = {};
  return {
    statusCode,
    body,
    status(code: number) {
      statusCode.n = code;
      return this;
    },
    json(payload: unknown) {
      body.json = payload;
      return this;
    },
  } as unknown as Response & { statusCode: { n: number }; body: { json?: unknown } };
}

describe("requireTrustedOrigin (CSRF)", () => {
  it("allows safe methods without Origin", async () => {
    const res = mockRes();
    let next = false;
    await requireTrustedOrigin(
      { method: "GET", headers: {} } as Request,
      res,
      () => {
        next = true;
      }
    );
    assert.equal(next, true);
  });

  it("blocks cross-site POST with a bad Origin", async () => {
    const res = mockRes();
    let next = false;
    await requireTrustedOrigin(
      {
        method: "POST",
        headers: { origin: "https://evil.example" },
      } as unknown as Request,
      res,
      () => {
        next = true;
      }
    );
    assert.equal(next, false);
    assert.equal(res.statusCode.n, 403);
  });

  it("blocks a POST the browser marks cross-site even without Origin", async () => {
    const res = mockRes();
    let next = false;
    await requireTrustedOrigin(
      { method: "POST", headers: { "sec-fetch-site": "cross-site" } } as unknown as Request,
      res,
      () => {
        next = true;
      }
    );
    assert.equal(next, false);
    assert.equal(res.statusCode.n, 403);
  });

  it("allows server-to-server POST with no Origin (webhooks)", async () => {
    const res = mockRes();
    let next = false;
    await requireTrustedOrigin(
      { method: "POST", headers: {} } as Request,
      res,
      () => {
        next = true;
      }
    );
    assert.equal(next, true);
  });
});
