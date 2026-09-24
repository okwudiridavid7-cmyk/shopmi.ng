import type { ContactInquiry, Prisma } from "@prisma/client";
import { prisma } from "../db/prisma";
import { env } from "../config/env";

export const DEFAULT_CONTACT_RETENTION_DAYS = 180;

export type PurgeReason = "retention" | "admin_delete" | "admin_dsar";

export type PurgeResult = {
  deletedCount: number;
  logId: string;
};

export function contactRetentionDays(): number {
  const n = env.contactInquiryRetentionDays;
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : DEFAULT_CONTACT_RETENTION_DAYS;
}

export function computeContactExpiresAt(
  from: Date = new Date(),
  days = contactRetentionDays()
): Date {
  const d = new Date(from.getTime());
  d.setUTCDate(d.getUTCDate() + days);
  return d;
}

/** Where clause: past expiresAt, or legacy null expiresAt older than retention. */
export function expiredContactInquiryWhere(
  now: Date = new Date(),
  retentionDays = contactRetentionDays()
): Prisma.ContactInquiryWhereInput {
  const legacyCutoff = new Date(now.getTime());
  legacyCutoff.setUTCDate(legacyCutoff.getUTCDate() - retentionDays);
  return {
    OR: [
      { expiresAt: { lte: now } },
      { AND: [{ expiresAt: null }, { createdAt: { lte: legacyCutoff } }] },
    ],
  };
}

export type PurgeDeps = {
  deleteMany?: (
    where: Prisma.ContactInquiryWhereInput
  ) => Promise<{ count: number }>;
  writeLog?: (data: {
    reason: PurgeReason;
    deletedCount: number;
    actorUserId?: string | null;
    detail?: string | null;
  }) => Promise<{ id: string }>;
  now?: Date;
  retentionDays?: number;
};

async function defaultWriteLog(data: {
  reason: PurgeReason;
  deletedCount: number;
  actorUserId?: string | null;
  detail?: string | null;
}): Promise<{ id: string }> {
  return prisma.contactInquiryPurgeLog.create({
    data: {
      reason: data.reason,
      deletedCount: data.deletedCount,
      actorUserId: data.actorUserId ?? null,
      detail: data.detail?.slice(0, 255) ?? null,
    },
    select: { id: true },
  });
}

/**
 * Delete expired contact inquiries and write an audit log row (REM-16).
 */
export async function purgeExpiredContactInquiries(
  deps?: PurgeDeps
): Promise<PurgeResult> {
  const now = deps?.now ?? new Date();
  const retentionDays = deps?.retentionDays ?? contactRetentionDays();
  const where = expiredContactInquiryWhere(now, retentionDays);
  const deleteMany =
    deps?.deleteMany ??
    ((w: Prisma.ContactInquiryWhereInput) =>
      prisma.contactInquiry.deleteMany({ where: w }));
  const writeLog = deps?.writeLog ?? defaultWriteLog;

  const { count } = await deleteMany(where);
  const log = await writeLog({
    reason: "retention",
    deletedCount: count,
    detail: `retention_days=${retentionDays}`,
  });

  // eslint-disable-next-line no-console
  console.info(
    JSON.stringify({
      type: "contact.purge",
      ts: now.toISOString(),
      reason: "retention",
      deletedCount: count,
      logId: log.id,
    })
  );

  return { deletedCount: count, logId: log.id };
}

export async function deleteContactInquiryById(
  id: string,
  actorUserId: string
): Promise<{ deleted: boolean; logId?: string }> {
  const existing = await prisma.contactInquiry.findUnique({ where: { id } });
  if (!existing) return { deleted: false };

  await prisma.contactInquiry.delete({ where: { id } });
  const log = await defaultWriteLog({
    reason: "admin_delete",
    deletedCount: 1,
    actorUserId,
    detail: `id=${id}`,
  });
  return { deleted: true, logId: log.id };
}

/**
 * DSAR-style delete by submitter email (stored lowercased on create).
 */
export async function deleteContactInquiriesByEmail(
  email: string,
  actorUserId: string,
  deps?: {
    deleteMany?: (normalizedEmail: string) => Promise<number>;
    writeLog?: typeof defaultWriteLog;
  }
): Promise<PurgeResult> {
  const normalized = email.trim().toLowerCase();
  const deleteMany =
    deps?.deleteMany ??
    (async (em: string) => {
      const res = await prisma.contactInquiry.deleteMany({
        where: { email: em },
      });
      return res.count;
    });
  const writeLog = deps?.writeLog ?? defaultWriteLog;

  const deletedCount = await deleteMany(normalized);
  const log = await writeLog({
    reason: "admin_dsar",
    deletedCount,
    actorUserId,
    detail: `email=${normalized}`,
  });
  return { deletedCount, logId: log.id };
}

export function toContactInquiryAdmin(row: ContactInquiry) {
  return {
    id: row.id,
    scope: row.scope,
    tenantId: row.tenantId,
    slug: row.slug,
    name: row.name,
    email: row.email,
    phone: row.phone,
    subject: row.subject,
    message: row.message,
    status: row.status,
    providerMessageId: row.providerMessageId,
    error: row.error,
    expiresAt: row.expiresAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}
