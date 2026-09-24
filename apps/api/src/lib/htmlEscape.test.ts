import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { escapeHtml } from "./htmlEscape";

describe("escapeHtml (REM-04)", () => {
  it("escapes HTML special characters", () => {
    assert.equal(
      escapeHtml(`<img src=x onerror="alert(1)">&"'`),
      "&lt;img src=x onerror=&quot;alert(1)&quot;&gt;&amp;&quot;'"
    );
  });

  it("leaves plain text unchanged", () => {
    assert.equal(escapeHtml("Shopmi.ng"), "Shopmi.ng");
  });

  it("escapes a malicious appName-style string", () => {
    const evil = `<script>alert("x")</script>`;
    const out = escapeHtml(evil);
    assert.equal(out.includes("<script>"), false);
    assert.equal(out.includes("&lt;script&gt;"), true);
  });
});
