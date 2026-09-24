import { Resend } from "resend";
import { escapeHtml } from "../lib/htmlEscape";
import { env } from "../config/env";
import { getPlatformSetting } from "../lib/platformSettings";
import { MailConfigError, MailProviderError } from "./mailErrors";

export { MailConfigError, MailProviderError, isMailError } from "./mailErrors";

const MAIL_TIMEOUT_MS = 8_000;

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

export async function brandedEmailShell(inner: string): Promise<{
  appName: string;
  support: string;
  html: string;
}> {
  const appName = await getPlatformSetting("app_name", env.appName);
  const support = await getPlatformSetting(
    "support_email",
    "support@vendors.local"
  );
  return {
    appName,
    support,
    html: `
      <div style="font-family:Georgia,serif;max-width:560px;margin:0 auto;color:#14201a;">
        <h1 style="font-size:22px;margin-bottom:12px;">${escapeHtml(appName)}</h1>
        ${inner}
      </div>
    `,
  };
}
