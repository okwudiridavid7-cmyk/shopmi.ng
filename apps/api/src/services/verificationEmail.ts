import { Resend } from "resend";
import { prisma } from "../db/prisma";
import { env } from "../config/env";
import { getPlatformSetting } from "../lib/platformSettings";

/**
 * Notify seller that verification was rejected.
 * TODO(Phase 1 email): expand transactional templates; currently uses Resend like order emails.
 */
export async function sendVerificationRejectedEmail(opts: {
  to: string;
  shopName: string;
  reason: string;
}): Promise<void> {
  if (!env.resendApiKey) {
    console.warn(
      "[email] RESEND_API_KEY not set — skipping verification rejection email"
    );
    return;
  }

  const appName = await getPlatformSetting("app_name", "Vendors");
  const support = await getPlatformSetting("support_email", "");
  const resend = new Resend(env.resendApiKey);

  await resend.emails.send({
    from: env.emailFrom,
    to: opts.to,
    subject: `Verification update — ${opts.shopName}`,
    html: `
      <div style="font-family:Georgia,serif;max-width:560px;margin:0 auto;color:#14201a;">
        <h1 style="font-size:22px;">${appName}</h1>
        <p>We reviewed verification for <strong>${opts.shopName}</strong> and can’t approve it yet.</p>
        <p><strong>What to fix:</strong> ${opts.reason || "No details were provided — reply to support if that seems wrong."}</p>
        ${
          support
            ? `<p>Questions? Write <a href="mailto:${support}">${support}</a>.</p>`
            : ""
        }
        <p><a href="${env.webUrl}/seller/verification">Update and resubmit</a></p>
      </div>
    `,
  });
}
