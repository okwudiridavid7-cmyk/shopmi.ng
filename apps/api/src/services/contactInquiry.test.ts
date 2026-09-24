import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { contactEmailInner } from "./contactMessage";

describe("contactEmailInner", () => {
  it("escapes user content in the email body", () => {
    const html = contactEmailInner({
      headingHtml: "<p>Hello</p>",
      body: {
        name: `<img src=x onerror=alert(1)>`,
        email: "a@b.co",
        subject: "Hi & bye",
        message: "<script>x</script>",
      },
    });
    assert.equal(html.includes("<img"), false);
    assert.equal(html.includes("<script>"), false);
    assert.equal(html.includes("&lt;img"), true);
    assert.equal(html.includes("&amp;"), true);
    assert.match(html, /Untrusted user content/i);
  });
});
