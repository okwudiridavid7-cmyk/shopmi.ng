import crypto from "crypto";
import type { Request, Response } from "express";
import { env } from "../config/env";

const COOKIE = "oauth_state";
const TTL_MS = 10 * 60 * 1000;

export type OAuthIntent = { returnTo: string | null; role: "seller" | null };

/** Same rules as the web app's safeReturnTo: a local path only. */
export function safeLocalPath(value: unknown): string | null {
  if (typeof value !== "string" || !value.startsWith("/")) return null;
  if (/^\/[/\\]/.test(value) || /[\u0000-\u001f\\]/.test(value)) return null;
  return value.slice(0, 500);
}

function sign(data: string): string {
  return crypto
    .createHmac("sha256", `oauth-state:${env.jwtAccessSecret}`)
    .update(data)
    .digest("base64url");
}

function cookieOptions() {
  return {
    httpOnly: true,
    secure: env.isProd,
    sameSite: "lax" as const,
    path: "/api/auth/google",
  };
}

/**
 * The state carries a random nonce that must match an httpOnly cookie set on this
 * browser, so a callback URL started by someone else (login CSRF) is rejected.
 */
export function createOAuthState(res: Response, intent: OAuthIntent): string {
  const nonce = crypto.randomBytes(24).toString("base64url");
  const body = Buffer.from(
    JSON.stringify({ n: nonce, r: intent.returnTo, s: intent.role, t: Date.now() })
  ).toString("base64url");
  res.cookie(COOKIE, nonce, { ...cookieOptions(), maxAge: TTL_MS });
  return `${body}.${sign(body)}`;
}

export function consumeOAuthState(req: Request, res: Response): OAuthIntent | null {
  res.clearCookie(COOKIE, cookieOptions());
  const state = req.query.state;
  const cookieNonce = req.cookies?.[COOKIE];
  if (typeof state !== "string" || typeof cookieNonce !== "string") return null;
  const [body, mac] = state.split(".");
  if (!body || !mac) return null;
  const expected = Buffer.from(sign(body));
  const given = Buffer.from(mac);
  if (expected.length !== given.length || !crypto.timingSafeEqual(expected, given)) return null;
  let parsed: { n?: unknown; r?: unknown; s?: unknown; t?: unknown };
  try {
    parsed = JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
  } catch {
    return null;
  }
  if (typeof parsed.n !== "string" || typeof parsed.t !== "number") return null;
  if (Date.now() - parsed.t > TTL_MS) return null;
  const a = Buffer.from(parsed.n);
  const b = Buffer.from(cookieNonce);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  return { returnTo: safeLocalPath(parsed.r), role: parsed.s === "seller" ? "seller" : null };
}
