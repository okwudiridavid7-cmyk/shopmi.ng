import { escapeHtml } from "../lib/htmlEscape";
import { brandedEmailShell } from "./mail";

export type TransactionalEmailKind =
  | "welcome"
  | "verify_email"
  | "password_reset"
  | "order_buyer"
  | "order_seller"
  | "verification_approved"
  | "verification_rejected"
  | "plan_reminder"
  | "plan_ended"
  | "team_invite"
  | "domain_active"
  | "domain_renewal_due"
  | "order_refunded"
  | "domain_detached"
  | "admin_alert";

function plural(n: number, word: string) {
  return `${n} ${word}${n === 1 ? "" : "s"}`;
}

function p(html: string) {
  return `<p style="margin:0 0 12px;">${html}</p>`;
}

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
        <p style="margin:0 0 12px;">You're in! Your ${escapeHtml(app)} account is ready.</p>
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
      subject = `Payment confirmed: ${String(data.shopName ?? "your order")}`;
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
      subject = `New order: ${String(data.totalLabel ?? "payment received")}`;
      inner = `
        <p style="margin:0 0 12px;">${greeting(name)}</p>
        <p style="margin:0 0 12px;">Great news! <strong>${total}</strong> just came in from ${buyer}.</p>
        ${data.itemsHtml ? `<div style="margin:16px 0;">${data.itemsHtml}</div>` : ""}
        ${data.ordersUrl ? ctaButton(String(data.ordersUrl), "Open orders") : ""}
        <p style="margin:16px 0 0;">Pack carefully and keep buyers updated.</p>
      `;
      break;
    }
    case "verification_approved": {
      const shop = escapeHtml(String(data.shopName ?? "your shop"));
      subject = `Verified: ${String(data.shopName ?? "your shop")}`;
      inner = `
        <p style="margin:0 0 12px;">${greeting(name)}</p>
        <p style="margin:0 0 12px;"><strong>${shop}</strong> is now verified on the marketplace. Buyers will see your verified badge.</p>
        ${data.dashboardUrl ? ctaButton(String(data.dashboardUrl), "Open seller dashboard") : ""}
        <p style="margin:16px 0 0;">Congrats! You’re cleared to settle payouts once bank details are on file.</p>
      `;
      break;
    }
    case "verification_rejected": {
      const shop = escapeHtml(String(data.shopName ?? "your shop"));
      const reason = escapeHtml(String(data.reason ?? "Please update your documents and resubmit."));
      subject = `Verification update: ${String(data.shopName ?? "your shop")}`;
      inner = `
        <p style="margin:0 0 12px;">${greeting(name)}</p>
        <p style="margin:0 0 12px;">We reviewed verification for <strong>${shop}</strong> and can’t approve it yet.</p>
        <p style="margin:0 0 12px;"><strong>What to fix:</strong> ${reason}</p>
        ${data.verificationUrl ? ctaButton(String(data.verificationUrl), "Update and resubmit") : ""}
      `;
      break;
    }
    case "team_invite": {
      const shop = escapeHtml(String(data.shopName ?? "a shop"));
      const inviter = escapeHtml(String(data.inviterName ?? "The shop owner"));
      const role = escapeHtml(String(data.roleLabel ?? "team member"));
      subject = `You're invited to join ${String(data.shopName ?? "a shop")} on Shopmi.ng`;
      inner = `
        ${p(greeting(name))}
        ${p(`${inviter} invited you to join <strong>${shop}</strong> as a ${role}.`)}
        ${p("Open the link to accept. You'll sign in or create an account with this email address first.")}
        ${ctaButton(String(data.acceptUrl ?? "#"), "Accept invite")}
        <p style="margin:12px 0 0;font-size:13px;color:#6b7280;">This invite expires in 7 days. If you weren't expecting it, you can ignore this email.</p>
      `;
      break;
    }
    case "plan_reminder": {
      const shop = escapeHtml(String(data.shopName ?? "your shop"));
      const plan = escapeHtml(String(data.planName ?? "Your plan"));
      const isTrial = data.kind === "trial";
      const days = Number(data.daysLeft ?? 0);
      const free = data.freePlanName ? escapeHtml(String(data.freePlanName)) : null;
      const freeLimit = data.freeLimit != null ? Number(data.freeLimit) : null;
      const willPause = Number(data.willPause ?? 0);
      const openOrders = Number(data.openOrders ?? 0);
      const endsOn = escapeHtml(String(data.endsOn ?? ""));
      subject = isTrial
        ? `Your ${String(data.planName ?? "")} trial ends in ${plural(days, "day")}`
        : `Your ${String(data.planName ?? "")} plan ends in ${plural(days, "day")}`;
      inner = `
        ${p(greeting(name))}
        ${p(
          isTrial
            ? `Your free trial of <strong>${plan}</strong> for <strong>${shop}</strong> ends on <strong>${endsOn}</strong>.`
            : `The <strong>${plan}</strong> plan for <strong>${shop}</strong> ends on <strong>${endsOn}</strong>. Renew to keep everything as it is.`
        )}
        ${
          free
            ? p(
                `After that, your shop moves to ${free} and stays online${
                  freeLimit != null ? ` with up to ${freeLimit} live products` : ""
                }.${
                  willPause > 0
                    ? ` ${plural(willPause, "product")} will be paused, which hides them from shoppers. Nothing is deleted, and they come back when you upgrade.`
                    : ""
                }`
              )
            : p(
                "After that, your storefront will be unavailable to shoppers until you renew. Your dashboard keeps working."
              )
        }
        ${p(
          openOrders > 0
            ? `Orders already placed aren’t affected. You have ${plural(openOrders, "paid order")} to fulfil.`
            : "Orders already placed aren’t affected."
        )}
        ${data.planUrl ? ctaButton(String(data.planUrl), isTrial ? "Choose a plan" : "Renew plan") : ""}
      `;
      break;
    }
    case "plan_ended": {
      const shop = escapeHtml(String(data.shopName ?? "your shop"));
      const plan = escapeHtml(String(data.planName ?? "Your plan"));
      const isTrial = data.kind === "trial";
      const free = data.freePlanName ? escapeHtml(String(data.freePlanName)) : null;
      const paused = Number(data.paused ?? 0);
      const openOrders = Number(data.openOrders ?? 0);
      subject = isTrial
        ? `Your ${String(data.planName ?? "")} trial has ended`
        : `Your ${String(data.planName ?? "")} plan has ended`;
      inner = `
        ${p(greeting(name))}
        ${p(
          `${isTrial ? `Your free trial of <strong>${plan}</strong>` : `The <strong>${plan}</strong> plan`} for <strong>${shop}</strong> ended today.`
        )}
        ${
          free
            ? p(
                `Your shop is now on ${free} and your storefront is still online.${
                  paused > 0
                    ? ` ${plural(paused, "product")} ${paused === 1 ? "was" : "were"} paused to fit the plan’s limit. Nothing was deleted: upgrade to bring them back, or choose which products stay live from your dashboard.`
                    : ""
                }`
              )
            : p(
                "Your storefront is now unavailable to shoppers. Your dashboard still works, and it comes back as soon as you renew."
              )
        }
        ${
          openOrders > 0
            ? p(
                `You have ${plural(openOrders, "paid order")} to fulfil. Buyers can still see their orders and invoices.`
              )
            : ""
        }
        ${
          openOrders > 0 && data.ordersUrl
            ? ctaButton(String(data.ordersUrl), "Open orders")
            : data.planUrl
              ? ctaButton(String(data.planUrl), "See plans")
              : ""
        }
      `;
      break;
    }
    case "domain_active": {
      const domain = escapeHtml(String(data.domain ?? "your domain"));
      const shop = escapeHtml(String(data.shopName ?? "your shop"));
      subject = `${String(data.domain ?? "Your domain")} is registered`;
      inner = `
        ${p(greeting(name))}
        ${p(`<strong>${domain}</strong> is now registered to <strong>${shop}</strong>.`)}
        ${p(
          "We've pointed it at your storefront. It can take up to a few hours for the domain to work everywhere, and we'll secure it with SSL automatically."
        )}
        ${data.expiresOn ? p(`It's registered until <strong>${escapeHtml(String(data.expiresOn))}</strong>.`) : ""}
        ${data.domainUrl ? ctaButton(String(data.domainUrl), "Manage domain") : ""}
      `;
      break;
    }
    case "domain_renewal_due": {
      const domain = escapeHtml(String(data.domain ?? "your domain"));
      const days = Number(data.daysLeft ?? 0);
      const expiresOn = escapeHtml(String(data.expiresOn ?? ""));
      subject = `${String(data.domain ?? "Your domain")} expires in ${plural(days, "day")}`;
      inner = `
        ${p(greeting(name))}
        ${p(`<strong>${domain}</strong> expires on <strong>${expiresOn}</strong>.`)}
        ${p(
          "Renew it to keep your storefront on this address. If it expires, shoppers visiting it won't reach your shop and someone else could register it."
        )}
        ${data.domainUrl ? ctaButton(String(data.domainUrl), "Renew domain") : ""}
      `;
      break;
    }
    case "order_refunded": {
      const shop = escapeHtml(String(data.shopName ?? "the shop"));
      const total = escapeHtml(String(data.totalLabel ?? ""));
      const ref = escapeHtml(String(data.reference ?? data.orderId ?? ""));
      subject = `Refund on its way: ${String(data.shopName ?? "your order")}`;
      inner = `
        ${p(greeting(name))}
        ${p(`<strong>${shop}</strong> cancelled your order and we've refunded <strong>${total}</strong> to the card or account you paid with.`)}
        ${p("Refunds usually reach you within 5 to 10 working days, depending on your bank.")}
        ${p(`Reference: <code style="font-size:13px;">${ref}</code>`)}
        ${data.orderUrl ? ctaButton(String(data.orderUrl), "View order") : ""}
      `;
      break;
    }
    case "domain_detached": {
      const domain = escapeHtml(String(data.domain ?? "your domain"));
      subject = `${String(data.domain ?? "Your domain")} was disconnected`;
      inner = `
        ${p(greeting(name))}
        ${p(`<strong>${domain}</strong> no longer points to your shop, so we've disconnected it. Your shop is still live at its Shopmi.ng address.`)}
        ${p("If you moved the domain on purpose, there's nothing to do. Otherwise check its DNS records (and make sure Cloudflare's proxy is off for them) and connect it again.")}
        ${data.domainUrl ? ctaButton(String(data.domainUrl), "Reconnect domain") : ""}
      `;
      break;
    }
    case "admin_alert": {
      subject = `[Admin] ${String(data.title ?? "Platform alert")}`;
      const lines = String(data.body ?? "")
        .split("\n")
        .filter(Boolean)
        .map((line) => p(escapeHtml(line)))
        .join("");
      inner = `${p(`<strong>${escapeHtml(String(data.title ?? "Platform alert"))}</strong>`)}${lines}
        ${data.actionUrl ? ctaButton(String(data.actionUrl), "Open admin") : ""}`;
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
