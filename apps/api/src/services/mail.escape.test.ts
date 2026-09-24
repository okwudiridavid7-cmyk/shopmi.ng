import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { escapeHtml } from "../lib/htmlEscape";

/**
 * Mirrors brandedEmailShell's heading interpolation (REM-04) without hitting DB.
 */
function shellHeading(appName: string): string {
  return `<h1 style="font-size:22px;margin-bottom:12px;">${escapeHtml(appName)}</h1>`;
}

describe("brandedEmailShell appName escaping (REM-04)", () => {
  it("does not emit raw tags for a malicious app name", () => {
    const html = shellHeading(`<img src=x onerror=alert(1)>`);
    assert.equal(html.includes("<img"), false);
    assert.equal(html.includes("&lt;img"), true);
  });
});
