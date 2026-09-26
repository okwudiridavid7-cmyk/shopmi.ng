import { Resend } from "resend";
import { escapeHtml } from "../lib/htmlEscape";
import { env } from "../config/env";
import { getPlatformSetting } from "../lib/platformSettings";
import { MailConfigError, MailProviderError } from "./mailErrors";

export { MailConfigError, MailProviderError, isMailError } from "./mailErrors";

const MAIL_TIMEOUT_MS = 8_000;

/** Marketplace shopping hero — used as full promo-card background. */
const MARKETPLACE_BANNER_IMG =
  "https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?auto=format&fit=crop&w=1200&q=80";

const DEFAULT_SUPPORT_EMAIL = "support@shopmi.ng";

export type SendHtmlEmailResult = {
  providerMessageId: string | null;
};

type ResendSendFn = (payload: {
  from: string;
  to: string;
  subject: string;
  html: string;
  /** Submitter address so agents can Reply (REM-12). */
  replyTo?: string;
}) => Promise<{
  data: { id: string } | null;
  error: { message: string; name?: string } | null;
}>;

async function withTimeout<T>(
  promise: Promise<T>,
  ms: number,
  label: string
): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<T>((_, reject) => {
        timer = setTimeout(() => {
          reject(new MailProviderError(`${label} timed out after ${ms}ms`));
        }, ms);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

/**
 * Send transactional HTML email via Resend.
 * Throws MailConfigError / MailProviderError — never returns a silent false.
 */
export async function sendHtmlEmail(
  opts: {
    to: string;
    subject: string;
    html: string;
    /** Optional Reply-To (e.g. contact form submitter). */
    replyTo?: string;
    /** Resend Idempotency-Key — reuse inquiry id for at-most-once (REM-15). */
    idempotencyKey?: string;
  },
  deps?: {
    send?: ResendSendFn;
    timeoutMs?: number;
    /** Override config check (tests). Default: Boolean(env.resendApiKey). */
    configured?: boolean;
  }
): Promise<SendHtmlEmailResult> {
  const configured =
    deps?.configured !== undefined
      ? deps.configured
      : Boolean(env.resendApiKey);
  if (!configured) {
    throw new MailConfigError();
  }

  if (!deps?.send && !env.resendApiKey) {
    throw new MailConfigError();
  }

  const send: ResendSendFn =
    deps?.send ??
    (async (payload) => {
      const resend = new Resend(env.resendApiKey);
      return resend.emails.send(
        {
          from: payload.from,
          to: payload.to,
          subject: payload.subject,
          html: payload.html,
          ...(payload.replyTo ? { replyTo: payload.replyTo } : {}),
        },
        opts.idempotencyKey
          ? { idempotencyKey: opts.idempotencyKey }
          : undefined
      );
    });

  const timeoutMs = deps?.timeoutMs ?? MAIL_TIMEOUT_MS;

  let result: {
    data: { id: string } | null;
    error: { message: string; name?: string } | null;
  };
  try {
    result = await withTimeout(
      send({
        from: env.emailFrom,
        to: opts.to,
        subject: opts.subject,
        html: opts.html,
        ...(opts.replyTo ? { replyTo: opts.replyTo } : {}),
      }),
      timeoutMs,
      "Email send"
    );
  } catch (err) {
    if (err instanceof MailProviderError || err instanceof MailConfigError) {
      throw err;
    }
    const message = err instanceof Error ? err.message : "Email send failed";
    throw new MailProviderError(message);
  }

  if (result.error) {
    throw new MailProviderError(result.error.message || "Email provider error");
  }

  return { providerMessageId: result.data?.id ?? null };
}

/**
 * Branded shell: logo header, dark-mode-safe CTA colors, full-bleed promo card.
 * Keep API: brandedEmailShell(inner) → { appName, support, html }.
 */
export async function brandedEmailShell(inner: string): Promise<{
  appName: string;
  support: string;
  html: string;
}> {
  const appName = await getPlatformSetting("app_name", env.appName);
  const support = await getPlatformSetting(
    "support_email",
    DEFAULT_SUPPORT_EMAIL
  );
  const webUrl = await getPlatformSetting("web_url", env.webUrl);
  const safeName = escapeHtml(appName);
  const safeSupport = escapeHtml(support);
  const safeWeb = escapeHtml(webUrl.replace(/\/$/, ""));
  const year = new Date().getFullYear();
  // Email clients can't reliably swap logos by theme — lock light logo on white.
  const logoUrl = `${safeWeb}/brand/logo-light.png`;
  const headerBg = "#ffffff";
  const accent = "#ff822e";
  const linkColor = "#c2410c";
  // background-image solid fills resist Apple Mail dark-mode color inversion.
  const accentFill = `linear-gradient(${accent},${accent})`;
  const whiteFill = "linear-gradient(#ffffff,#ffffff)";

  return {
    appName,
    support,
    html: `<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="color-scheme" content="light dark" />
  <meta name="supported-color-schemes" content="light dark" />
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700&display=swap" rel="stylesheet" />
  <style>
    /*
     * EMAIL COLOR PERSISTENCE
     * Most clients invert colors in dark mode. What survives:
     * 1) background-image: linear-gradient(#hex,#hex) — Apple rarely inverts this
     * 2) -webkit-text-fill-color + color !important on span AND nested <font>
     * 3) bgcolor="" on <td> (HTML attribute, not only CSS)
     * 4) Re-declare locked rules inside @media (prefers-color-scheme: dark)
     * 5) [data-ogsc]/[data-ogsb] for Outlook.com / Yahoo
     * 6) color-scheme: light only on .persist — opt that subtree out of dark
     *
     * Locked classes (same in light + dark):
     *   .btn-primary   orange CTA, white label
     *   .btn-learn     white button, dark label
     *   .promo-headline white text on image card
     *   .email-header  white bar + light logo
     */
    :root { color-scheme: light dark; }
    body, .email-bg { background-color: #f3f4f6; color: #1a1a1a; }
    .email-card { background-color: #ffffff; }
    .email-body-text { color: #1f2937; }
    .email-muted { color: #666666; }
    .email-link { color: ${linkColor}; }
    .email-header,
    .persist {
      color-scheme: light only;
      background-color: #ffffff !important;
    }
    .btn-primary {
      background-color: ${accent} !important;
      background-image: ${accentFill} !important;
      color: #ffffff !important;
      -webkit-text-fill-color: #ffffff !important;
    }
    .btn-primary span,
    .btn-primary font {
      color: #ffffff !important;
      -webkit-text-fill-color: #ffffff !important;
    }
    .promo-headline,
    .promo-headline font {
      color: #ffffff !important;
      -webkit-text-fill-color: #ffffff !important;
    }
    .btn-learn {
      background-color: #ffffff !important;
      background-image: ${whiteFill} !important;
      color: #111827 !important;
      -webkit-text-fill-color: #111827 !important;
    }
    .btn-learn span,
    .btn-learn font {
      color: #111827 !important;
      -webkit-text-fill-color: #111827 !important;
    }
    @media (prefers-color-scheme: dark) {
      body, .email-bg { background-color: #0f1115 !important; color: #e5e7eb !important; }
      .email-card { background-color: #1a1d24 !important; }
      .email-body-text { color: #e5e7eb !important; }
      .email-muted { color: #9ca3af !important; }
      .email-link { color: ${accent} !important; }
      .email-header,
      .persist {
        color-scheme: light only !important;
        background-color: #ffffff !important;
      }
      .btn-primary {
        background-color: ${accent} !important;
        background-image: ${accentFill} !important;
        color: #ffffff !important;
        -webkit-text-fill-color: #ffffff !important;
      }
      .btn-primary span,
      .btn-primary font {
        color: #ffffff !important;
        -webkit-text-fill-color: #ffffff !important;
      }
      .promo-headline,
      .promo-headline font {
        color: #ffffff !important;
        -webkit-text-fill-color: #ffffff !important;
      }
      .btn-learn {
        background-color: #ffffff !important;
        background-image: ${whiteFill} !important;
        color: #111827 !important;
        -webkit-text-fill-color: #111827 !important;
      }
      .btn-learn span,
      .btn-learn font {
        color: #111827 !important;
        -webkit-text-fill-color: #111827 !important;
      }
    }
    [data-ogsc] .btn-primary,
    [data-ogsb] .btn-primary {
      background-color: ${accent} !important;
      color: #ffffff !important;
    }
    [data-ogsc] .btn-primary span,
    [data-ogsb] .btn-primary span {
      color: #ffffff !important;
    }
    [data-ogsc] .btn-learn,
    [data-ogsb] .btn-learn {
      background-color: #ffffff !important;
      color: #111827 !important;
    }
    [data-ogsc] .promo-headline,
    [data-ogsb] .promo-headline {
      color: #ffffff !important;
    }
    [data-ogsc] .email-header,
    [data-ogsb] .email-header {
      background-color: #ffffff !important;
    }
  </style>
</head>
<body class="email-bg" style="margin:0;padding:0;background-color:#f3f4f6;font-family:'Montserrat',Helvetica,Arial,sans-serif;-webkit-font-smoothing:antialiased;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" class="email-bg" style="background-color:#f3f4f6;padding:24px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" class="email-card" style="max-width:560px;background-color:#ffffff;border-radius:12px;overflow:hidden;">
          <!-- Permanent white header + light logo -->
          <tr>
            <td class="email-header" bgcolor="${headerBg}" style="background-color:${headerBg} !important;padding:22px 24px;text-align:center;border-bottom:1px solid #f3f4f6;">
              <a href="${safeWeb}" style="display:inline-block;text-decoration:none;">
                <img src="${logoUrl}" alt="${safeName}" width="168" height="40" style="display:block;margin:0 auto;height:40px;width:auto;max-width:200px;border:0;outline:none;" />
              </a>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td class="email-body-text" style="padding:28px 28px 8px;font-family:'Montserrat',Helvetica,Arial,sans-serif;font-size:15px;line-height:1.65;color:#1f2937;text-align:left;">
              ${inner}
            </td>
          </tr>
          <!-- Promo: image as full card background; locked white text + white Learn More -->
          <tr>
            <td style="padding:8px 28px 24px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-radius:14px;overflow:hidden;background-color:#0f172a;">
                <tr>
                  <td
                    background="${MARKETPLACE_BANNER_IMG}"
                    bgcolor="#0f172a"
                    style="background-image:url('${MARKETPLACE_BANNER_IMG}');background-size:cover;background-position:center;background-color:#0f172a;border-radius:14px;"
                  >
                    <!--[if gte mso 9]>
                    <v:rect xmlns:v="urn:schemas-microsoft-com:vml" fill="true" stroke="false" style="width:504px;">
                    <v:fill type="frame" src="${MARKETPLACE_BANNER_IMG}" color="#0f172a" />
                    <v:textbox style="mso-fit-shape-to-text:true" inset="0,0,0,0">
                    <![endif]-->
                    <div style="background:linear-gradient(105deg,rgba(15,23,42,0.94) 0%,rgba(15,23,42,0.78) 48%,rgba(15,23,42,0.45) 100%);padding:24px 22px;">
                      <p class="promo-headline" style="margin:0 0 14px;font-family:'Montserrat',Helvetica,Arial,sans-serif;font-size:16px;font-weight:700;line-height:1.35;color:#ffffff !important;-webkit-text-fill-color:#ffffff;">
                        <font color="#ffffff">Grow your shop on ${safeName}</font>
                      </p>
                      <a href="${safeWeb}/pricing" class="btn-learn" style="display:inline-block;padding:8px 16px;border-radius:999px;background-color:#ffffff !important;background-image:${whiteFill} !important;color:#111827 !important;-webkit-text-fill-color:#111827;font-family:'Montserrat',Helvetica,Arial,sans-serif;font-size:12px;font-weight:600;text-decoration:none;border:1px solid #ffffff;">
                        <span style="color:#111827 !important;-webkit-text-fill-color:#111827;"><font color="#111827">Learn More</font></span>
                      </a>
                    </div>
                    <!--[if gte mso 9]>
                    </v:textbox>
                    </v:rect>
                    <![endif]-->
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <!-- Disclaimer -->
          <tr>
            <td class="email-muted" style="padding:0 28px 28px;font-family:'Montserrat',Helvetica,Arial,sans-serif;font-size:12px;line-height:1.55;color:#666666;">
              <p style="margin:0 0 8px;">
                This message was sent by an automated system. Need help?
                <a class="email-link" href="mailto:${safeSupport}" style="color:${linkColor};text-decoration:underline;">${safeSupport}</a>
              </p>
              <p style="margin:0;">
                <a class="email-link" href="${safeWeb}/terms" style="color:${linkColor};text-decoration:underline;">Terms</a>
                &nbsp;·&nbsp;
                <a class="email-link" href="${safeWeb}/privacy" style="color:${linkColor};text-decoration:underline;">Privacy</a>
              </p>
            </td>
          </tr>
        </table>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;margin-top:16px;">
          <tr>
            <td align="center" class="email-muted" style="padding:4px 12px 16px;font-family:'Montserrat',Helvetica,Arial,sans-serif;font-size:12px;color:#9ca3af;">
              © ${year} ${safeName} · All Rights Reserved
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`,
  };
}
