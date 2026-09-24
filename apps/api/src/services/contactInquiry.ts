import crypto from "crypto";
import type { ContactInquiry, ContactInquiryStatus } from "@prisma/client";
import { Prisma } from "@prisma/client";
import { prisma } from "../db/prisma";
import { brandedEmailShell, isMailError } from "../services/mail";
import { sanitizeHeaderFragment } from "../lib/sanitizeHeader";
import {
  getContactMailQueue,
  type ContactMailJobPayload,
} from "../queue/connection";
import { computeContactExpiresAt } from "./contactRetention";
import {
  contactEmailInner,
  type ContactPayload,
} from "./contactMessage";
import {
  mintConfirmToken,
  sendShopContactConfirmEmail,
  type SendConfirmMailFn,
} from "./contactConfirm";
import type { EnqueueContactMailFn } from "./contactConfirm";

export type { ContactPayload };
export { contactEmailInner };

export type { EnqueueContactMailFn };

export type ContactSubmitInput = {
  scope: "platform" | "shop";
  tenantId?: string | null;
  slug?: string | null;
  to: string;
  body: ContactPayload;
  idempotencyKey?: string | null;
  ip?: string | null;
  userAgent?: string | null;
  /** Prebuilt HTML inner body (already escaped by caller). */
  emailInnerHtml: string;
  emailSubjectPrefix: string;
  /**
   * Shop-only: require submitter email confirmation before notifying shop (REM-17).
   * Platform scope ignores this.
   */
  requireSenderConfirm?: boolean;
  /** Display name used in the confirmation email. */
  shopName?: string;
};

export type ContactSubmitSuccess = {
  ok: true;
  id: string;
  status: "queued" | "sent" | "awaiting_confirm";
  replay: boolean;
};

export type ContactSubmitFailure = {
  ok: false;
  id: string;
  status: "failed";
  code: "MAIL_UNAVAILABLE" | "MAIL_REJECTED";
  error: string;
  replay: boolean;
};

function hashIp(ip: string | null | undefined): string | null {
  if (!ip) return null;
  return crypto.createHash("sha256").update(ip).digest("hex");
}

function responseForExisting(
  row: ContactInquiry
): ContactSubmitSuccess | ContactSubmitFailure {
  if (row.status === "sent") {
    return { ok: true, id: row.id, status: "sent", replay: true };
  }
  if (row.status === "awaiting_confirm") {
    return {
      ok: true,
      id: row.id,
      status: "awaiting_confirm",
      replay: true,
    };
  }
  if (row.status === "queued" || row.status === "received") {
    return { ok: true, id: row.id, status: "queued", replay: true };
  }
  return {
    ok: false,
    id: row.id,
    status: "failed",
    code: "MAIL_REJECTED",
    error: row.error || "Previous delivery failed.",
    replay: true,
  };
}

async function defaultEnqueue(payload: ContactMailJobPayload): Promise<void> {
  await getContactMailQueue().add("send", payload, {
    jobId: payload.inquiryId,
  });
}

/**
 * Persist inquiry and either enqueue shop/platform mail or start confirm flow (REM-15/17).
 * Idempotent when idempotencyKey is provided.
 */
export async function submitContactInquiry(
  input: ContactSubmitInput,
  deps?: {
    enqueue?: EnqueueContactMailFn;
    sendConfirmMail?: SendConfirmMailFn;
  }
): Promise<ContactSubmitSuccess | ContactSubmitFailure> {
  const key = input.idempotencyKey?.trim() || null;
  const enqueue = deps?.enqueue ?? defaultEnqueue;
  const requireConfirm =
    input.scope === "shop" && Boolean(input.requireSenderConfirm);

  if (key) {
    const existing = await prisma.contactInquiry.findUnique({
      where: { idempotencyKey: key },
    });
    if (existing) return responseForExisting(existing);
  }

  const token = requireConfirm ? mintConfirmToken() : null;

  let inquiry: ContactInquiry;
  try {
    inquiry = await prisma.contactInquiry.create({
      data: {
        scope: input.scope,
        tenantId: input.tenantId ?? null,
        slug: input.slug ?? null,
        name: input.body.name,
        email: input.body.email.trim().toLowerCase(),
        phone: input.body.phone ?? null,
        subject: input.body.subject,
        message: input.body.message,
        ipHash: hashIp(input.ip),
        userAgent: input.userAgent?.slice(0, 512) ?? null,
        idempotencyKey: key,
        status: requireConfirm ? "awaiting_confirm" : "queued",
        recipientEmail: input.to,
        confirmTokenHash: token?.hash ?? null,
        confirmTokenExpires: token?.expiresAt ?? null,
        expiresAt: computeContactExpiresAt(),
      },
    });
  } catch (err) {
    if (
      key &&
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === "P2002"
    ) {
      const existing = await prisma.contactInquiry.findUnique({
        where: { idempotencyKey: key },
      });
      if (existing) return responseForExisting(existing);
    }
    throw err;
  }

  if (requireConfirm && token) {
    try {
      await sendShopContactConfirmEmail({
        to: input.body.email.trim().toLowerCase(),
        shopName: input.shopName || input.slug || "the shop",
        rawToken: token.raw,
        send: deps?.sendConfirmMail,
      });
      return {
        ok: true,
        id: inquiry.id,
        status: "awaiting_confirm",
        replay: false,
      };
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : isMailError(err)
            ? err.message
            : "Failed to send confirmation email.";
      await prisma.contactInquiry.update({
        where: { id: inquiry.id },
        data: {
          status: "failed" satisfies ContactInquiryStatus,
          error: message.slice(0, 2000),
          confirmTokenHash: null,
          confirmTokenExpires: null,
        },
      });
      return {
        ok: false,
        id: inquiry.id,
        status: "failed",
        code: "MAIL_UNAVAILABLE",
        error: message,
        replay: false,
      };
    }
  }

  const { html } = await brandedEmailShell(input.emailInnerHtml);
  const subject =
    `${sanitizeHeaderFragment(input.emailSubjectPrefix)} ${input.body.subject}`.trim();

  const payload: ContactMailJobPayload = {
    inquiryId: inquiry.id,
    to: input.to,
    subject,
    html,
    replyTo: input.body.email,
  };

  try {
    await enqueue(payload);
    return {
      ok: true,
      id: inquiry.id,
      status: "queued",
      replay: false,
    };
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to enqueue contact mail.";
    await prisma.contactInquiry.update({
      where: { id: inquiry.id },
      data: {
        status: "failed" satisfies ContactInquiryStatus,
        error: message.slice(0, 2000),
      },
    });
    return {
      ok: false,
      id: inquiry.id,
      status: "failed",
      code: "MAIL_UNAVAILABLE",
      error: message,
      replay: false,
    };
  }
}
