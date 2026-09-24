import type { NextFunction, Request, Response } from "express";
import type { User, UserRole } from "@prisma/client";
import { prisma } from "../db/prisma";
import { ACCESS_COOKIE } from "./cookies";
import { verifyAccessToken } from "./tokens";

declare global {
  namespace Express {
    interface Request {
      user?: User;
    }
  }
}

export async function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const user = await loadUserFromRequest(req);
    if (!user) {
      return res.status(401).json({ error: "Authentication required" });
    }
    req.user = user;
    return next();
  } catch {
    return res.status(401).json({ error: "Invalid or expired access token" });
  }
}

/** Attach req.user when a valid session exists; otherwise continue anonymously. */
export async function optionalAuth(
  req: Request,
  _res: Response,
  next: NextFunction
) {
  try {
    const user = await loadUserFromRequest(req);
    if (user) req.user = user;
  } catch {
    // ignore invalid tokens for optional auth
  }
  return next();
}

async function loadUserFromRequest(req: Request): Promise<User | null> {
  const token =
    req.cookies?.[ACCESS_COOKIE] ??
    (req.headers.authorization?.startsWith("Bearer ")
      ? req.headers.authorization.slice(7)
      : undefined);

  if (!token) return null;

  const payload = verifyAccessToken(token);
  return prisma.user.findUnique({ where: { id: payload.sub } });
}


export function requireRoles(...roles: UserRole[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: "Authentication required" });
    }
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: "Insufficient permissions" });
    }
    return next();
  };
}
