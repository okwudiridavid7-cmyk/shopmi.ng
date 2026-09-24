import type { Store, ClientRateLimitInfo } from "express-rate-limit";
import type IORedis from "ioredis";
import { getRedisConnection } from "../queue/connection";

/**
 * Redis-backed express-rate-limit store (REM-06).
 * Each limiter should get its own store instance (unique prefix).
 */
export function createRedisRateLimitStore(
  name: string,
  deps?: { redis?: IORedis }
): Store {
  const prefix = `rl:${name}:`;
  let windowMs = 60_000;
  const redis = () => deps?.redis ?? getRedisConnection();

  const store: Store = {
    localKeys: false,
    init(options) {
      windowMs = options.windowMs;
    },
    async get(key: string): Promise<ClientRateLimitInfo | undefined> {
      const redisKey = prefix + key;
      const r = redis();
      const [hitsRaw, ttl] = await Promise.all([
        r.get(redisKey),
        r.pttl(redisKey),
      ]);
      if (hitsRaw == null) return undefined;
      const totalHits = Number(hitsRaw) || 0;
      const resetTime =
        ttl > 0 ? new Date(Date.now() + ttl) : new Date(Date.now() + windowMs);
      return { totalHits, resetTime };
    },
    async increment(key: string): Promise<ClientRateLimitInfo> {
      const redisKey = prefix + key;
      const r = redis();
      const totalHits = await r.incr(redisKey);
      if (totalHits === 1) {
        await r.pexpire(redisKey, windowMs);
      }
      let ttl = await r.pttl(redisKey);
      if (ttl < 0) {
        await r.pexpire(redisKey, windowMs);
        ttl = windowMs;
      }
      return {
        totalHits,
        resetTime: new Date(Date.now() + Math.max(ttl, 0)),
      };
    },
    async decrement(key: string): Promise<void> {
      const redisKey = prefix + key;
      const r = redis();
      const n = await r.decr(redisKey);
      if (n <= 0) await r.del(redisKey);
    },
    async resetKey(key: string): Promise<void> {
      await redis().del(prefix + key);
    },
  };

  return store;
}
