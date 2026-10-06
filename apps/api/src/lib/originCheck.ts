import type { NextFunction, Request, Response } from "express";
import { env } from "../config/env";
import { isCorsOriginAllowed, parseAllowedOrigins } from "./corsOrigin";
import { isVerifiedCustomDomain } from "./customDomains";

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

const corsConfig = () => ({
  isProd: env.isProd,
  webUrl: env.webUrl,
  shopBaseDomain: env.shopBaseDomain,
  allowedOrigins: parseAllowedOrigins(env.allowedOrigins),
});

/** Marketplace, shop subdomains and configured extras: may call the API with cookies. */
export function isTrustedOrigin(origin: string): boolean {
  return isCorsOriginAllowed(origin, corsConfig());
}

/** A seller's verified custom domain: may call the API, but never with cookies. */
export async function isCustomDomainOrigin(origin: string): Promise<boolean> {
  let hostname: string;
  try {
    hostname = new URL(origin).hostname;
  } catch {
    return false;
  }
  return isVerifiedCustomDomain(hostname).catch(() => false);
}

export type OriginTrust = "trusted" | "custom-domain" | "none";

export async function originTrust(origin: string | undefined): Promise<OriginTrust> {
  if (!origin) return "none";
  if (isTrustedOrigin(origin)) return "trusted";
  return (await isCustomDomainOrigin(origin)) ? "custom-domain" : "none";
}

/**
 * CSRF defence on top of SameSite=Lax: a state-changing request from a browser must
 * come from one of our origins. Custom domains are accepted because the browser
 * never attaches our cookies to their requests, so they can't act as a user.
 * Requests without Origin and without Sec-Fetch-Site are non-browser clients.
 */
export async function requireTrustedOrigin(req: Request, res: Response, next: NextFunction) {
  if (SAFE_METHODS.has(req.method)) return next();
  const origin = req.headers.origin;
  if (origin && origin !== "null") {
    const trust = await originTrust(origin);
    if (trust !== "none") return next();
    return res.status(403).json({ error: "Request blocked", code: "BAD_ORIGIN" });
  }
  const site = req.headers["sec-fetch-site"];
  if (site === "cross-site" || origin === "null") {
    return res.status(403).json({ error: "Request blocked", code: "BAD_ORIGIN" });
  }
  return next();
}
