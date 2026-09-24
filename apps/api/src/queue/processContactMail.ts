import type { ContactInquiry, ContactInquiryStatus } from "@prisma/client";
import { prisma } from "../db/prisma";
import {
  sendHtmlEmail,
  isMailError,
  type SendHtmlEmailResult,
} from "../services/mail";
import type { ContactMailJobPayload } from "./connection";

export type ProcessContactMailResult =
  | { outcome: "sent"; providerMessageId: string | null }
  | { outcome: "skipped"; reason: "already_sent" | "not_retryable" | "missing" }
  | { outcome: "failed"; error: string };

export type ProcessContactMailDeps = {
  findInquiry?: (
    id: string
  ) => Promise<Pick<
    ContactInquiry,
    "id" | "status" | "providerMessageId"
  > | null>;
  markSent?: (
    id: string,
    providerMessageId: string | null
  ) => Promise<void>;
  markFailed?: (id: string, error: string) => Promise<void>;
  send?: (opts: {
    to: string;
    subject: string;
    html: string;
    replyTo?: string;
    idempotencyKey?: string;
  }) => Promise<SendHtmlEmailResult>;
};

function shouldAttemptSend(
  row: Pick<ContactInquiry, "status" | "providerMessageId">
): boolean {
  if (row.providerMessageId) return false;
  if (row.status === "sent") return false;
  // queued / received / failed (no provider id) are eligible
  return (
    row.status === "queued" ||
    row.status === "received" ||
    row.status === "failed"
  );
}

/**
 * At-most-once contact mail delivery (REM-15).
 * Retries only when status is failed/queued/received and providerMessageId is null.
 */
export async function processContactMailJob(
  data: ContactMailJobPayload,
  deps?: ProcessContactMailDeps
): Promise<ProcessContactMailResult> {
  const findInquiry =
    deps?.findInquiry ??
    (async (id: string) =>
      prisma.contactInquiry.findUnique({
        where: { id },
        select: { id: true, status: true, providerMessageId: true },
      }));
  const markSent =
    deps?.markSent ??
    (async (id, providerMessageId) => {
      await prisma.contactInquiry.update({
        where: { id },
        data: {
          status: "sent" satisfies ContactInquiryStatus,
          providerMessageId,
          error: null,
        },
      });
    });
  const markFailed =
    deps?.markFailed ??
    (async (id, error) => {
      await prisma.contactInquiry.update({
        where: { id },
        data: {
          status: "failed" satisfies ContactInquiryStatus,
          error: error.slice(0, 2000),
        },
      });
    });
  const send = deps?.send ?? sendHtmlEmail;

  const inquiry = await findInquiry(data.inquiryId);
  if (!inquiry) {
    return { outcome: "skipped", reason: "missing" };
  }

  if (inquiry.providerMessageId || inquiry.status === "sent") {
    return { outcome: "skipped", reason: "already_sent" };
  }

  if (!shouldAttemptSend(inquiry)) {
    return { outcome: "skipped", reason: "not_retryable" };
  }

  try {
    const sent = await send({
      to: data.to,
      subject: data.subject,
      html: data.html,
      replyTo: data.replyTo,
      idempotencyKey: data.inquiryId,
    });
    await markSent(data.inquiryId, sent.providerMessageId);
    return {
      outcome: "sent",
      providerMessageId: sent.providerMessageId,
    };
  } catch (err) {
    const message =
      err instanceof Error
        ? err.message
        : isMailError(err)
          ? err.message
          : "Email delivery failed.";
    await markFailed(data.inquiryId, message);
    throw err;
  }
}
