/**
 * TENANT ISOLATION - security boundary
 * =====================================
 * Every query against a tenant-scoped table MUST include tenantId from a
 * server-resolved TenantContext. Never accept tenant_id from the client
 * (no X-Tenant-Id, no body.tenantId for scoping).
 *
 * Resolvers:
 * - resolveTenantFromMembership: seller / tenant_admin authenticated routes
 * - resolveTenantFromSlug: public storefront routes (/api/shops/:slug/...)
 *
 * Later: swap resolveTenantFromSlug for a subdomain-based resolver with the
 * same TenantContext return shape - callers stay unchanged.
 */

import { prisma } from "../db/prisma";
import { env } from "../config/env";
import type { TenantStatus } from "@prisma/client";

export class TenantIsolationError extends Error {
  status: number;
  code?: string;

  constructor(message: string, status = 403, code?: string) {
    super(message);
    this.name = "TenantIsolationError";
    this.status = status;
    this.code = code;
  }
}

export type TenantContext = {
  tenantId: string;
  slug: string;
  source: "membership" | "slug";
  /** Present when resolved via membership (seller routes). */
  membershipRole?: "owner" | "manager" | "staff";
};

/**
 * Canonical filter fragment. Always spread into Prisma `where` for
 * tenant-scoped models. Do not reimplement `{ tenantId }` ad hoc in routes.
 */
export function tenantWhere<T extends object = object>(
  ctx: TenantContext,
  extra?: T
): { tenantId: string } & T {
  if (!ctx?.tenantId) {
    throw new TenantIsolationError("Missing tenant context - refusing query", 500);
  }
  return { tenantId: ctx.tenantId, ...(extra ?? ({} as T)) };
}

/** Assert a row's tenantId matches the resolved context (defense in depth). */
export function assertSameTenant(
  ctx: TenantContext,
  rowTenantId: string | null | undefined
): void {
  if (!rowTenantId || rowTenantId !== ctx.tenantId) {
    throw new TenantIsolationError("Resource does not belong to this tenant", 404);
  }
}

/**
 * Authenticated seller / tenant_admin routes:
 * Resolve tenant from the user's tenant_admins membership (server-side only).
 * If the user belongs to multiple tenants, pass preferredTenantId only when it
 * was already validated against membership (e.g. from a prior membership lookup),
 * never from a raw client header.
 */
export async function resolveTenantFromMembership(
  userId: string,
  preferredTenantId?: string
): Promise<TenantContext> {
  const memberships = await prisma.tenantAdmin.findMany({
    where: { userId },
    include: { tenant: true },
    orderBy: { tenant: { createdAt: "asc" } },
  });

  if (memberships.length === 0) {
    throw new TenantIsolationError("User has no tenant membership", 403);
  }

  // The shop the user picked; otherwise the shop they own; otherwise their oldest membership.
  const membership =
    (preferredTenantId && memberships.find((m) => m.tenantId === preferredTenantId)) ||
    memberships.find((m) => m.role === "owner") ||
    memberships[0]!;

  return {
    tenantId: membership.tenantId,
    slug: membership.tenant.slug,
    source: "membership",
    membershipRole: membership.role,
  };
}

/** Shops in these states are hidden from shoppers; dashboards and orders still work. */
export const UNAVAILABLE_SHOP_STATUSES: TenantStatus[] = ["suspended", "lapsed"];

export function isShopAvailable(status: TenantStatus): boolean {
  return !UNAVAILABLE_SHOP_STATUSES.includes(status);
}

function assertShopAvailable(status: TenantStatus) {
  if (status === "suspended") {
    throw new TenantIsolationError("Shop is suspended", 403);
  }
  if (status === "lapsed") {
    throw new TenantIsolationError(
      "This shop is temporarily unavailable",
      403,
      "SHOP_UNAVAILABLE"
    );
  }
}

/**
 * Public storefront routes: resolve tenant from :slug (tenants.slug).
 * Same shape as a future subdomain resolver - keep call sites on TenantContext.
 */
export async function resolveTenantFromSlug(slug: string): Promise<TenantContext> {
  if (!slug || typeof slug !== "string") {
    throw new TenantIsolationError("Shop slug is required", 400);
  }

  const tenant = await prisma.tenant.findUnique({
    where: { slug: slug.toLowerCase() },
  });

  if (!tenant) {
    throw new TenantIsolationError("Shop not found", 404);
  }

  assertShopAvailable(tenant.status);

  return {
    tenantId: tenant.id,
    slug: tenant.slug,
    source: "slug",
  };
}

/** Tenant owning a verified custom domain, and whether its plan still includes custom domains. */
export async function findVerifiedDomainTenant(hostname: string) {
  const tenant = await prisma.tenant.findFirst({
    where: { customDomain: hostname, customDomainVerifiedAt: { not: null } },
    include: { plan: true },
  });
  if (!tenant) return null;
  const domainAllowed =
    !tenant.plan ||
    !!(tenant.plan.featureFlags as { customDomain?: boolean } | null)?.customDomain;
  return { ...tenant, domainAllowed };
}

/**
 * Subdomain / custom-domain routing: look up tenants.slug or custom_domain from Host,
 * return the same TenantContext. Callers keep using tenantWhere(ctx).
 * Used by GET /api/shops/resolve-host - Next.js middleware must call that endpoint
 * rather than reimplementing lookup.
 */
export async function resolveTenantFromHost(host: string): Promise<TenantContext> {
  const hostname = host.split(":")[0]?.toLowerCase();
  if (!hostname) {
    throw new TenantIsolationError("Host header missing", 400);
  }

  const byCustom = await findVerifiedDomainTenant(hostname);
  if (byCustom?.domainAllowed) {
    assertShopAvailable(byCustom.status);
    return {
      tenantId: byCustom.id,
      slug: byCustom.slug,
      source: "slug",
    };
  }

  const baseHost = env.shopBaseDomain.split(":")[0]?.toLowerCase() ?? "";
  let sub = "";
  if (baseHost && (hostname === baseHost || hostname.endsWith(`.${baseHost}`))) {
    if (hostname !== baseHost) {
      sub = hostname.slice(0, -(baseHost.length + 1));
      // Drop multi-label leftovers (e.g. www.shop) - take leftmost label only when single hop
      if (sub.includes(".")) {
        sub = sub.split(".")[0] ?? "";
      }
    }
  } else if (hostname.endsWith(".lvh.me")) {
    // Local dev when SHOP_BASE_DOMAIN is still localhost:3000
    sub = hostname.split(".")[0] ?? "";
  }

  if (sub && sub !== "www") {
    const bySlug = await prisma.tenant.findUnique({ where: { slug: sub } });
    if (bySlug) {
      assertShopAvailable(bySlug.status);
      return {
        tenantId: bySlug.id,
        slug: bySlug.slug,
        source: "slug",
      };
    }
  }

  throw new TenantIsolationError("Shop not found for host", 404);
}
