import { escapeHtml } from "../lib/htmlEscape";
import { brandedEmailShell } from "./mail";

export type TransactionalEmailKind =
  | "welcome"
  | "verify_email"
  | "password_reset"
  | "order_buyer"
  | "order_seller"
  | "verification_approved"
  | "verification_rejected";

function ctaButton(href: string, label: string): string {
  const safeHref = escapeHtml(href);
  const safeLabel = escapeHtml(label);
  const accent = "#ff822e";
  const accentFill = `linear-gradient(${accent},${accent})`;
  return `<p style="margin:24px 0 8px;">
    <a href="${safeHref}" class="btn-primary" style="display:inline-block;padding:12px 22px;border-radius:999px;background-color:${accent} !important;background-image:${accentFill} !important;color:#ffffff !important;-webkit-text-fill-color:#ffffff;font-family:'Montserrat',Helvetica,Arial,sans-serif;font-size:14px;font-weight:600;text-decoration:none;border:1px solid ${accent};">
      <span style="color:#ffffff !important;-webkit-text-fill-color:#ffffff !important;"><font color="#ffffff !important">${safeLabel}</font></span>
    </a>
  </p>`;
}

function greeting(name?: string | null): string {
  const first = name?.trim().split(/\s+/)[0];
  return first ? `Hello ${escapeHtml(first)},` : "Hello,";
}

/** Build branded HTML for each transactional email kind. */
export async function buildTransactionalEmail(
  kind: TransactionalEmailKind,
  data: Record<string, string | number | null | undefined>
): Promise<{ subject: string; html: string; appName: string }> {
  const name = typeof data.name === "string" ? data.name : null;
  let subject = "";
  let inner = "";

  switch (kind) {
    case "welcome": {
      const app = String(data.appName ?? "Shopmi.ng");
      subject = `Welcome to ${app}`;
      inner = `
        <p style="margin:0 0 12px;">${greeting(name)}</p>
        <p style="margin:0 0 12px;">You're in — your ${escapeHtml(app)} account is ready.</p>
        <p style="margin:0 0 12px;">Browse shops, save favorites, or open your own storefront when you're ready to sell.</p>
        ${data.dashboardUrl ? ctaButton(String(data.dashboardUrl), "Go to your dashboard") : ""}
        <p style="margin:16px 0 0;">Thank you for choosing ${escapeHtml(app)}.</p>
      `;
      break;
    }
    case "verify_email": {
      subject = "Verify your email";
      inner = `
        <p style="margin:0 0 12px;">${greeting(name)}</p>
        <p style="margin:0 0 12px;">Please confirm this email address so we can keep your account secure and send order updates.</p>
        ${ctaButton(String(data.verifyUrl ?? "#"), "Verify email")}
        <p style="margin:12px 0 0;font-size:13px;color:#6b7280;">This link expires in 24 hours. If you didn’t create an account, you can ignore this message.</p>
      `;
      break;
    }
    case "password_reset": {
      subject = "Reset your password";
      inner = `
        <p style="margin:0 0 12px;">${greeting(name)}</p>
        <p style="margin:0 0 12px;">We received a request to reset the password for this account.</p>
        ${ctaButton(String(data.resetUrl ?? "#"), "Choose a new password")}
        <p style="margin:12px 0 0;font-size:13px;color:#6b7280;">This link expires in one hour. If you didn’t ask for this, you can ignore the email.</p>
      `;
      break;
    }
    case "order_buyer": {
      const shop = escapeHtml(String(data.shopName ?? "a shop"));
      const total = escapeHtml(String(data.totalLabel ?? ""));
      const ref = escapeHtml(String(data.reference ?? data.orderId ?? ""));
      subject = `Payment confirmed — ${String(data.shopName ?? "your order")}`;
      inner = `
        <p style="margin:0 0 12px;">${greeting(name)}</p>
        <p style="margin:0 0 12px;"><strong>${total}</strong> has been paid for your order from <strong>${shop}</strong>.</p>
        <p style="margin:0 0 12px;">Reference: <code style="font-size:13px;">${ref}</code></p>
        ${data.itemsHtml ? `<div style="margin:16px 0;">${data.itemsHtml}</div>` : ""}
        ${data.orderUrl ? ctaButton(String(data.orderUrl), "View order & invoice") : ""}
        <p style="margin:16px 0 0;">Thank you for shopping with us.</p>
      `;
      break;
    }
    case "order_seller": {
      const total = escapeHtml(String(data.totalLabel ?? ""));
      const buyer = escapeHtml(String(data.buyerEmail ?? "a buyer"));
      subject = `New order — ${String(data.totalLabel ?? "payment received")}`;
      inner = `
        <p style="margin:0 0 12px;">${greeting(name)}</p>
        <p style="margin:0 0 12px;">Great news — <strong>${total}</strong> just came in from ${buyer}.</p>
        ${data.itemsHtml ? `<div style="margin:16px 0;">${data.itemsHtml}</div>` : ""}
        ${data.ordersUrl ? ctaButton(String(data.ordersUrl), "Open orders") : ""}
        <p style="margin:16px 0 0;">Pack carefully and keep buyers updated.</p>
      `;
      break;
    }
    case "verification_approved": {
      const shop = escapeHtml(String(data.shopName ?? "your shop"));
      subject = `Verified — ${String(data.shopName ?? "your shop")}`;
      inner = `
        <p style="margin:0 0 12px;">${greeting(name)}</p>
        <p style="margin:0 0 12px;"><strong>${shop}</strong> is now verified on the marketplace. Buyers will see your verified badge.</p>
        ${data.dashboardUrl ? ctaButton(String(data.dashboardUrl), "Open seller dashboard") : ""}
        <p style="margin:16px 0 0;">Congrats — you’re cleared to settle payouts once bank details are on file.</p>
      `;
      break;
    }
    case "verification_rejected": {
      const shop = escapeHtml(String(data.shopName ?? "your shop"));
      const reason = escapeHtml(String(data.reason ?? "Please update your documents and resubmit."));
      subject = `Verification update — ${String(data.shopName ?? "your shop")}`;
      inner = `
        <p style="margin:0 0 12px;">${greeting(name)}</p>
        <p style="margin:0 0 12px;">We reviewed verification for <strong>${shop}</strong> and can’t approve it yet.</p>
        <p style="margin:0 0 12px;"><strong>What to fix:</strong> ${reason}</p>
        ${data.verificationUrl ? ctaButton(String(data.verificationUrl), "Update and resubmit") : ""}
      `;
      break;
    }
    default: {
      subject = "Notification";
      inner = `<p>${greeting(name)}</p><p>You have a new update.</p>`;
    }
  }

  const shell = await brandedEmailShell(inner);
  return { subject, html: shell.html, appName: shell.appName };
}
