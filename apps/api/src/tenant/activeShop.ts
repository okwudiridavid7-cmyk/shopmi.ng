import type { Request, Response } from "express";
import { env } from "../config/env";

export const ACTIVE_SHOP_COOKIE = "active_shop";

/** Which shop the dashboard acts on, for users who belong to more than one. Membership is re-checked on every request. */
export function setActiveShopCookie(res: Response, tenantId: string): void {
  res.cookie(ACTIVE_SHOP_COOKIE, tenantId, {
    httpOnly: true,
    secure: env.isProd,
    sameSite: "lax",
    domain: env.cookieDomain === "localhost" ? undefined : env.cookieDomain,
    path: "/",
    maxAge: 365 * 24 * 60 * 60 * 1000,
  });
}

export function readActiveShopCookie(req: Request): string | undefined {
  const v = req.cookies?.[ACTIVE_SHOP_COOKIE];
  return typeof v === "string" && /^[a-z0-9]{10,40}$/i.test(v) ? v : undefined;
}
