import { prisma } from "../db/prisma";
import { env } from "../config/env";
import { enqueueTransactionalMail } from "../queue/transactionalMail";

/**
 * Notify seller that verification was rejected.
 */
export async function sendVerificationRejectedEmail(opts: {
  to: string;
  shopName: string;
  reason: string;
  name?: string | null;
}): Promise<void> {
  await enqueueTransactionalMail({
    kind: "verification_rejected",
    to: opts.to,
    data: {
      name: opts.name,
      shopName: opts.shopName,
      reason: opts.reason,
      verificationUrl: `${env.webUrl}/seller/verification`,
    },
    idempotencyKey: `verify-reject:${opts.to}:${Date.now()}`,
  });
}

export async function sendVerificationApprovedEmail(opts: {
  to: string;
  shopName: string;
  name?: string | null;
}): Promise<void> {
  await enqueueTransactionalMail({
    kind: "verification_approved",
    to: opts.to,
    data: {
      name: opts.name,
      shopName: opts.shopName,
      dashboardUrl: `${env.webUrl}/seller`,
    },
    idempotencyKey: `verify-ok:${opts.to}:${Date.now()}`,
  });
}

/** Look up owner email for a tenant and send rejection (used by admin routes). */
export async function notifyTenantVerificationRejected(
  tenantId: string,
  reason: string
): Promise<void> {
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    include: { owner: true },
  });
  if (!tenant?.owner.email) return;
  await sendVerificationRejectedEmail({
    to: tenant.owner.email,
    shopName: tenant.name,
    reason,
    name: tenant.owner.name,
  });
}

export async function notifyTenantVerificationApproved(
  tenantId: string
): Promise<void> {
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    include: { owner: true },
  });
  if (!tenant?.owner.email) return;
  await sendVerificationApprovedEmail({
    to: tenant.owner.email,
    shopName: tenant.name,
    name: tenant.owner.name,
  });
}
