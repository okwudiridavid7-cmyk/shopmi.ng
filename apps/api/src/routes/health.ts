import { Router } from "express";
import type { HelloResponse } from "@vendors/shared-types";
import { requireAuth } from "../auth/middleware";
import { prisma } from "../db/prisma";
import { toTenantPublic, toUserPublic } from "../lib/serialize";
import { resolveTenantFromMembership } from "../tenant/tenantContext";
import { tenantWhere } from "../tenant/tenantContext";

export const healthRouter = Router();

healthRouter.get("/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

/**
 * Proves auth + tenant middleware end-to-end.
 * Returns the authenticated user and their tenant (if any membership exists).
 */
healthRouter.get("/hello", requireAuth, async (req, res, next) => {
  try {
    const user = req.user!;
    let tenantPayload = null;

    try {
      const ctx = await resolveTenantFromMembership(user.id);
      const membership = await prisma.tenantAdmin.findFirst({
        where: tenantWhere(ctx, { userId: user.id }),
        include: { tenant: true },
      });
      if (membership) {
        tenantPayload = toTenantPublic(membership.tenant);
      }
    } catch {
      // No membership yet — still a valid authenticated hello.
    }

    const body: HelloResponse = {
      message: `Hello, ${user.email}`,
      user: toUserPublic(user),
      tenant: tenantPayload,
    };
    return res.json(body);
  } catch (err) {
    return next(err);
  }
});
