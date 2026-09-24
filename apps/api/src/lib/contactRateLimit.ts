import rateLimit, { type Options } from "express-rate-limit";
import type { Request, Response } from "express";
import { createRedisRateLimitStore } from "./redisRateLimitStore";
import { logContactEvent, newContactRequestId } from "./contactLog";

function rateLimitedHandler(req: Request, res: Response) {
  const slug = req.params.slug
    ? String(req.params.slug).toLowerCase()
    : null;
  logContactEvent({
    requestId: newContactRequestId(),
    route: slug ? "shop" : "platform",
    slug,
    outcome: "rate_limited",
    latencyMs: 0,
    code: "RATE_LIMITED",
  });
  res.status(429).json({
    error: "Too many requests. Please try again later.",
    code: "RATE_LIMITED",
  });
}

const base: Partial<Options> = {
  standardHeaders: true,
  legacyHeaders: false,
  handler: rateLimitedHandler,
  validate: {
    // We intentionally create one store per limiter name.
    unsharedStore: false,
    // trust proxy is set on the app in index.ts
    xForwardedForHeader: false,
  },
};

function clientIp(req: Request): string {
  return req.ip || req.socket.remoteAddress || "unknown";
}

/** Platform contact: 5 / 15 minutes / IP */
export const platformContactIpLimiter = rateLimit({
  ...base,
  windowMs: 15 * 60 * 1000,
  max: 5,
  store: createRedisRateLimitStore("contact-platform-ip"),
  keyGenerator: (req) => clientIp(req),
});

/** Shop contact: 3 / 15 minutes / IP / slug */
export const shopContactIpLimiter = rateLimit({
  ...base,
  windowMs: 15 * 60 * 1000,
  max: 3,
  store: createRedisRateLimitStore("contact-shop-ip"),
  keyGenerator: (req) => {
    const slug = String(req.params.slug || "unknown").toLowerCase();
    return `${slug}:${clientIp(req)}`;
  },
});

/** Shop contact: 30 / hour / slug (all IPs) */
export const shopContactGlobalLimiter = rateLimit({
  ...base,
  windowMs: 60 * 60 * 1000,
  max: 30,
  store: createRedisRateLimitStore("contact-shop-global"),
  keyGenerator: (req) => String(req.params.slug || "unknown").toLowerCase(),
});
