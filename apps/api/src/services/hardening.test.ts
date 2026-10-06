import assert from "node:assert/strict";
import { describe, it } from "node:test";
import sharp from "sharp";
import type { Request, Response } from "express";
import { ImageRejectedError, normalizeImage } from "./images";
import { cleanDescription } from "./aiDescription";
import { addMonths, termPrice } from "../lib/plans";
import { quotaPeriodStart } from "../lib/aiQuota";
import { consumeOAuthState, createOAuthState } from "../auth/oauthState";

describe("uploads: disguised and polyglot files", () => {
  it("rejects HTML disguised as an image", async () => {
    const html = Buffer.from("<html><script>alert(1)</script></html>");
    await assert.rejects(() => normalizeImage(html), ImageRejectedError);
  });

  it("rejects a truncated PNG header", async () => {
    const junk = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x00, 0x00]);
    await assert.rejects(() => normalizeImage(junk), ImageRejectedError);
  });

  it("strips script appended to a valid image (polyglot)", async () => {
    const png = await sharp({
      create: { width: 8, height: 8, channels: 3, background: "#336699" },
    })
      .png()
      .toBuffer();
    const polyglot = Buffer.concat([png, Buffer.from("<script>alert(document.cookie)</script>")]);
    const { buffer } = await normalizeImage(polyglot);
    assert.equal(buffer.subarray(0, 4).toString("ascii"), "RIFF");
    assert.ok(!buffer.toString("latin1").includes("<script"));
  });
});

describe("AI description output", () => {
  it("strips markdown and links, and caps length", () => {
    const raw = "# Hello\n\n**Bold** claim http://evil.example/x\n\n" + "word ".repeat(400);
    const out = cleanDescription(raw);
    assert.ok(!out.includes("#"));
    assert.ok(!out.includes("**"));
    assert.ok(!out.includes("http"));
    assert.ok(out.length <= 1500);
  });

  it("starts the monthly quota at midnight Lagos time", () => {
    const start = quotaPeriodStart(new Date(Date.UTC(2026, 2, 15, 12)));
    assert.equal(start.toISOString(), "2026-02-28T23:00:00.000Z");
  });
});

describe("plan billing math", () => {
  it("applies term discounts", () => {
    assert.equal(termPrice(10000, 1), 10000);
    assert.equal(termPrice(10000, 6), 51000);
    assert.equal(termPrice(10000, 12), 84000);
  });

  it("clamps month-end overflow", () => {
    const feb = addMonths(new Date(Date.UTC(2024, 0, 31)), 1);
    assert.equal(feb.toISOString().slice(0, 10), "2024-02-29");
  });
});

describe("Google OAuth state", () => {
  function issue() {
    let nonce = "";
    const res = {
      cookie: (_name: string, value: string) => {
        nonce = value;
      },
      clearCookie: () => undefined,
    } as unknown as Response;
    const state = createOAuthState(res, { returnTo: "/seller", role: "seller" });
    return { state, nonce, res };
  }

  it("accepts the state only from the browser that started the flow", () => {
    const { state, nonce, res } = issue();
    const ok = consumeOAuthState(
      { query: { state }, cookies: { oauth_state: nonce } } as unknown as Request,
      res
    );
    assert.deepEqual(ok, { returnTo: "/seller", role: "seller" });

    const other = issue();
    const csrf = consumeOAuthState(
      { query: { state }, cookies: { oauth_state: other.nonce } } as unknown as Request,
      res
    );
    assert.equal(csrf, null);
  });

  it("rejects a tampered state", () => {
    const { state, nonce, res } = issue();
    const [body, mac] = state.split(".");
    const forged = `${body}x.${mac}`;
    assert.equal(
      consumeOAuthState(
        { query: { state: forged }, cookies: { oauth_state: nonce } } as unknown as Request,
        res
      ),
      null
    );
  });
});
