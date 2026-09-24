import { escapeHtml } from "../lib/htmlEscape";

export type ContactPayload = {
  name: string;
  email: string;
  phone?: string;
  subject: string;
  message: string;
};

export function contactEmailInner(opts: {
  headingHtml: string;
  body: ContactPayload;
}): string {
  const { body } = opts;
  return `
      <p style="color:#8a5a00;font-size:13px;border:1px solid #f0d9a0;background:#fff8e8;padding:10px 12px;border-radius:6px;">
        Untrusted user content — treat links and attachments with care. Reply using your own judgment.
      </p>
      ${opts.headingHtml}
      <p><strong>From:</strong> ${escapeHtml(body.name)} &lt;${escapeHtml(body.email)}&gt;</p>
      ${body.phone ? `<p><strong>Phone:</strong> ${escapeHtml(body.phone)}</p>` : ""}
      <p><strong>Subject:</strong> ${escapeHtml(body.subject)}</p>
      <p style="white-space:pre-wrap;">${escapeHtml(body.message)}</p>
    `;
}
