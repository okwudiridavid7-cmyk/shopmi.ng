import rateLimit from "express-rate-limit";
import type { Request } from "express";
import { createRedisRateLimitStore } from "./redisRateLimitStore";

type KeyBy = "ip" | "user" | "tenant" | ((req: Request) => string);

function keyFor(by: KeyBy, req: Request): string {
  if (typeof by === "function") return by(req);
  const ip = req.ip || "unknown";
  if (by === "user") return req.user?.id ? `u:${req.user.id}` : `ip:${ip}`;
  if (by === "tenant") return req.tenant?.tenantId ? `t:${req.tenant.tenantId}` : `ip:${ip}`;
  return `ip:${ip}`;
}

/**
 * Redis-backed limiter shared across API instances. If Redis is unreachable the
 * limiter lets the request through (logged) rather than taking the API down.
 */
export function redisRateLimit(opts: {
  name: string;
  windowMs: number;
  max: number;
  by?: KeyBy;
  message?: string;
  skip?: (req: Request) => boolean;
}) {
  return rateLimit({
    windowMs: opts.windowMs,
    limit: opts.max,
    standardHeaders: true,
    legacyHeaders: false,
    store: createRedisRateLimitStore(opts.name, { timeoutMs: 1500 }),
    passOnStoreError: true,
    keyGenerator: (req) => keyFor(opts.by ?? "ip", req),
    skip: opts.skip,
    handler: (_req, res) => {
      res.status(429).json({
        error: opts.message ?? "Too many requests. Please wait a moment and try again.",
        code: "RATE_LIMITED",
      });
    },
    validate: { unsharedStore: false, xForwardedForHeader: false, trustProxy: false },
  });
}
