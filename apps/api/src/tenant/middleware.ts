import type { NextFunction, Request, Response } from "express";
import {
  resolveTenantFromMembership,
  resolveTenantFromSlug,
  TenantIsolationError,
  type TenantContext,
} from "./tenantContext";

declare global {
  namespace Express {
    interface Request {
      tenant?: TenantContext;
    }
  }
}

function handleTenantError(err: unknown, res: Response, next: NextFunction) {
  if (err instanceof TenantIsolationError) {
    return res.status(err.status).json({ error: err.message });
  }
  return next(err);
}

/** Attach tenant from authenticated user's tenant_admins membership. */
export function requireTenantFromMembership() {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user?.id) {
        return res.status(401).json({ error: "Authentication required" });
      }
      req.tenant = await resolveTenantFromMembership(req.user.id);
      return next();
    } catch (err) {
      return handleTenantError(err, res, next);
    }
  };
}

/** Restrict seller mutations to owner/manager (staff is read/write products only by default). */
export function requireTenantRoles(
  ...roles: Array<"owner" | "manager" | "staff">
) {
  return (req: Request, res: Response, next: NextFunction) => {
    const role = req.tenant?.membershipRole;
    if (!role || !roles.includes(role)) {
      return res.status(403).json({ error: "Insufficient shop permissions" });
    }
    return next();
  };
}

/** Attach tenant from :slug route param (public storefront). */
export function requireTenantFromSlugParam(paramName = "slug") {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const slug = req.params[paramName];
      req.tenant = await resolveTenantFromSlug(slug);
      return next();
    } catch (err) {
      return handleTenantError(err, res, next);
    }
  };
}
