import crypto from "crypto";
import type { ContactInquiry, ContactInquiryStatus } from "@prisma/client";
import { prisma } from "../db/prisma";
import { env } from "../config/env";
import {
  brandedEmailShell,
  sendHtmlEmail,
  isMailError,
  type SendHtmlEmailResult,
} from "./mail";
import { escapeHtml } from "../lib/htmlEscape";
import { sanitizeHeaderFragment } from "../lib/sanitizeHeader";
import {
  getContactMailQueue,
  type ContactMailJobPayload,
} from "../queue/connection";
import {
  contactEmailInner,
  type ContactPayload,
} from "./contactMessage";
import { resolveShopContactRecipient } from "../lib/shopContact";

export const CONFIRM_TOKEN_TTL_MS = 48 * 60 * 60 * 1000;

export type EnqueueContactMailFn = (
  payload: ContactMailJobPayload
) => Promise<void>;

export function hashConfirmToken(raw: string): string {
  return crypto.createHash("sha256").update(raw).digest("hex");
}

export function mintConfirmToken(): {
  raw: string;
  hash: string;
  expiresAt: Date;
} {
  const raw = crypto.randomBytes(32).toString("hex");
  return {
    raw,
    hash: hashConfirmToken(raw),
    expiresAt: new Date(Date.now() + CONFIRM_TOKEN_TTL_MS),
  };
}

export function confirmContactUrl(rawToken: string): string {
  const base = env.webUrl.replace(/\/$/, "");
  return `${base}/contact/confirm?token=${encodeURIComponent(rawToken)}`;
}

export type SendConfirmMailFn = (opts: {
  to: string;
  subject: string;
  html: string;
}) => Promise<SendHtmlEmailResult>;

export async function sendShopContactConfirmEmail(opts: {
  to: string;
  shopName: string;
  rawToken: string;
  send?: SendConfirmMailFn;
}): Promise<void> {
  const link = confirmContactUrl(opts.rawToken);
  const inner = `
      <p>Please confirm you want to send a message to <strong>${escapeHtml(opts.shopName)}</strong>.</p>
      <p>This stops someone else from using your email address on a shop contact form.</p>
      <p><a href="${escapeHtml(link)}">Confirm and send my message</a></p>
      <p style="color:#666;font-size:13px;">This link expires in 48 hours. If you did not submit a contact form, you can ignore this email.</p>
    `;
  const { html } = await brandedEmailShell(inner);
  const send = opts.send ?? sendHtmlEmail;
  await send({
    to: opts.to,
    subject: `Confirm your message to ${sanitizeHeaderFragment(opts.shopName)}`,
    html,
  });
}

export type ConfirmContactResult =
  | { ok: true; id: string; status: "queued" | "sent"; replay: boolean }
  | {
      ok: false;
      id?: string;
      code:
        | "INVALID_TOKEN"
        | "EXPIRED"
        | "NO_RECIPIENT"
        | "MAIL_UNAVAILABLE"
        | "NOT_PENDING";
      error: string;
    };

/**
 * Confirm a shop contact inquiry and enqueue notify-shop mail (REM-17).
 * Unconfirmed inquiries never reach the shop mail queue.
 */
export async function confirmShopContactInquiry(
  rawToken: string,
  deps?: {
    enqueue?: EnqueueContactMailFn;
    findByHash?: (hash: string) => Promise<ContactInquiry | null>;
    findTenant?: (
      id: string
    ) => Promise<{
      name: string;
      email: string | null;
      themeSettings: unknown;
    } | null>;
    updateInquiry?: (
      id: string,
      data: Record<string, unknown>
    ) => Promise<void>;
    buildNotifyMail?: (opts: {
      shopName: string;
      body: ContactPayload;
    }) => Promise<{ html: string; subject: string }>;
    now?: Date;
  }
): Promise<ConfirmContactResult> {
  const token = rawToken.trim();
  if (!token || token.length < 16 || token.length > 128) {
    return {
      ok: false,
      code: "INVALID_TOKEN",
      error: "Invalid confirmation link.",
    };
  }

  const hash = hashConfirmToken(token);
  const findByHash =
    deps?.findByHash ??
    ((h: string) =>
      prisma.contactInquiry.findUnique({ where: { confirmTokenHash: h } }));
  const findTenant =
    deps?.findTenant ??
    (async (id: string) =>
      prisma.tenant.findUnique({
        where: { id },
        select: { name: true, email: true, themeSettings: true },
      }));
  const updateInquiry =
    deps?.updateInquiry ??
    (async (id: string, data: Record<string, unknown>) => {
      await prisma.contactInquiry.update({
        where: { id },
        data: data as never,
      });
    });
  const enqueue =
    deps?.enqueue ??
    (async (payload: ContactMailJobPayload) => {
      await getContactMailQueue().add("send", payload, {
        jobId: payload.inquiryId,
      });
    });
  const now = deps?.now ?? new Date();

  const inquiry = await findByHash(hash);
  if (!inquiry) {
    return {
      ok: false,
      code: "INVALID_TOKEN",
      error: "Invalid or already used confirmation link.",
    };
  }

  if (inquiry.status === "queued" || inquiry.status === "sent") {
    return {
      ok: true,
      id: inquiry.id,
      status: inquiry.status === "sent" ? "sent" : "queued",
      replay: true,
    };
  }

  if (inquiry.status !== "awaiting_confirm") {
    return {
      ok: false,
      id: inquiry.id,
      code: "NOT_PENDING",
      error: "This message cannot be confirmed.",
    };
  }

  if (
    !inquiry.confirmTokenExpires ||
    inquiry.confirmTokenExpires.getTime() < now.getTime()
  ) {
    return {
      ok: false,
      id: inquiry.id,
      code: "EXPIRED",
      error: "This confirmation link has expired. Please submit again.",
    };
  }

  let to = inquiry.recipientEmail;
  let shopName = inquiry.slug ?? "the shop";

  if (inquiry.tenantId) {
    const tenant = await findTenant(inquiry.tenantId);
    if (tenant) {
      shopName = tenant.name;
      const theme =
        tenant.themeSettings && typeof tenant.themeSettings === "object"
          ? (tenant.themeSettings as Record<string, unknown>)
          : {};
      const resolved = resolveShopContactRecipient({
        tenantEmail: tenant.email,
        theme,
      });
      if (resolved) to = resolved;
    }
  }

  if (!to) {
    await updateInquiry(inquiry.id, {
      status: "failed" satisfies ContactInquiryStatus,
      error: "Shop has no contact recipient at confirm time.",
      confirmTokenHash: null,
      confirmTokenExpires: null,
    });
    return {
      ok: false,
      id: inquiry.id,
      code: "NO_RECIPIENT",
      error: "This shop is no longer accepting messages.",
    };
  }

  const body: ContactPayload = {
    name: inquiry.name,
    email: inquiry.email,
    phone: inquiry.phone ?? undefined,
    subject: inquiry.subject,
    message: inquiry.message,
  };

  let html: string;
  let subject: string;
  if (deps?.buildNotifyMail) {
    const built = await deps.buildNotifyMail({ shopName, body });
    html = built.html;
    subject = built.subject;
  } else {
    const shell = await brandedEmailShell(
      contactEmailInner({
        headingHtml: `<p>New message for <strong>${escapeHtml(shopName)}</strong>.</p>`,
        body,
      })
    );
    html = shell.html;
    subject = `[${sanitizeHeaderFragment(shopName)}] ${inquiry.subject}`.trim();
  }

  const payload: ContactMailJobPayload = {
    inquiryId: inquiry.id,
    to,
    subject,
    html,
    replyTo: inquiry.email,
  };

  try {
    await updateInquiry(inquiry.id, {
      status: "queued" satisfies ContactInquiryStatus,
      recipientEmail: to,
      confirmTokenHash: null,
      confirmTokenExpires: null,
      error: null,
    });
    await enqueue(payload);
    return {
      ok: true,
      id: inquiry.id,
      status: "queued",
      replay: false,
    };
  } catch (err) {
    const message =
      err instanceof Error
        ? err.message
        : isMailError(err)
          ? err.message
          : "Failed to queue message.";
    await updateInquiry(inquiry.id, {
      status: "failed",
      error: message.slice(0, 2000),
    });
    return {
      ok: false,
      id: inquiry.id,
      code: "MAIL_UNAVAILABLE",
      error: message,
    };
  }
}
