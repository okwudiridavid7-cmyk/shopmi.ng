import { randomUUID } from "crypto";
import type { Request, Response } from "express";
import { env } from "../config/env";

export const CART_SESSION_COOKIE = "cart_session";

export function getOrSetCartSessionId(req: Request, res: Response): string {
  const existing = req.cookies?.[CART_SESSION_COOKIE];
  if (existing && typeof existing === "string" && existing.length >= 8) {
    return existing;
  }
  const id = randomUUID();
  res.cookie(CART_SESSION_COOKIE, id, {
    httpOnly: true,
    secure: env.isProd,
    sameSite: env.isProd ? "none" : "lax",
    domain: env.cookieDomain === "localhost" ? undefined : env.cookieDomain,
    path: "/",
    maxAge: 30 * 24 * 60 * 60 * 1000,
  });
  return id;
}
