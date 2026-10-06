import type { Store, ClientRateLimitInfo } from "express-rate-limit";
import type IORedis from "ioredis";
import { getRedisConnection } from "../queue/connection";

function withTimeout<T>(p: Promise<T>, ms: number | undefined): Promise<T> {
  if (!ms) return p;
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("rate limit store timeout")), ms);
    p.then(
      (v) => {
        clearTimeout(timer);
        resolve(v);
      },
      (e) => {
        clearTimeout(timer);
        reject(e);
      }
    );
  });
}

/**
 * Redis-backed express-rate-limit store (REM-06).
 * Each limiter should get its own store instance (unique prefix).
 * `timeoutMs` bounds each call so a Redis outage surfaces as a store error
 * (which callers can choose to pass on) instead of a hung request.
 */
export function createRedisRateLimitStore(
  name: string,
  deps?: { redis?: IORedis; timeoutMs?: number }
): Store {
  const prefix = `rl:${name}:`;
  let windowMs = 60_000;
  const redis = () => deps?.redis ?? getRedisConnection();
  const t = deps?.timeoutMs;

  const store: Store = {
    localKeys: false,
    init(options) {
      windowMs = options.windowMs;
    },
    async get(key: string): Promise<ClientRateLimitInfo | undefined> {
      const redisKey = prefix + key;
      const r = redis();
      const [hitsRaw, ttl] = await withTimeout(Promise.all([r.get(redisKey), r.pttl(redisKey)]), t);
      if (hitsRaw == null) return undefined;
      const totalHits = Number(hitsRaw) || 0;
      const resetTime =
        ttl > 0 ? new Date(Date.now() + ttl) : new Date(Date.now() + windowMs);
      return { totalHits, resetTime };
    },
    async increment(key: string): Promise<ClientRateLimitInfo> {
      const redisKey = prefix + key;
      const r = redis();
      const [[, hits], [, ttlRaw]] = (await withTimeout(
        r.multi().incr(redisKey).pttl(redisKey).exec(),
        t
      )) as [[unknown, number], [unknown, number]];
      let ttl = ttlRaw;
      if (ttl < 0) {
        await withTimeout(r.pexpire(redisKey, windowMs), t);
        ttl = windowMs;
      }
      return {
        totalHits: hits,
        resetTime: new Date(Date.now() + Math.max(ttl, 0)),
      };
    },
    async decrement(key: string): Promise<void> {
      const redisKey = prefix + key;
      const r = redis();
      const n = await withTimeout(r.decr(redisKey), t);
      if (n <= 0) await withTimeout(r.del(redisKey), t);
    },
    async resetKey(key: string): Promise<void> {
      await withTimeout(redis().del(prefix + key), t);
    },
  };

  return store;
}
