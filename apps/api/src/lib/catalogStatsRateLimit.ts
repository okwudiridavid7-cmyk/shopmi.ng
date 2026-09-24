import rateLimit from "express-rate-limit";
import type { Request, Response } from "express";
import { createRedisRateLimitStore } from "./redisRateLimitStore";

/**
 * Light protection for public marketing /stats (REM-13).
 * Generous enough for About page reloads; stops naive scrape loops.
 */
export const catalogStatsLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  store: createRedisRateLimitStore("catalog-stats-ip"),
  keyGenerator: (req: Request) =>
    req.ip || req.socket.remoteAddress || "unknown",
  handler: (_req: Request, res: Response) => {
    res.status(429).json({
      error: "Too many requests. Please try again later.",
      code: "RATE_LIMITED",
    });
  },
  validate: {
    unsharedStore: false,
    xForwardedForHeader: false,
  },
});
