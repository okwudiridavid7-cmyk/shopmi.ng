import assert from "node:assert/strict";
import { describe, it, before, after } from "node:test";
import Redis from "ioredis";
import { env } from "../config/env";
import { createRedisRateLimitStore } from "./redisRateLimitStore";

describe("createRedisRateLimitStore (REM-06)", () => {
  let redis: Redis;
  const prefix = `test-rl-${Date.now()}`;

  before(() => {
    redis = new Redis(env.redisUrl, { maxRetriesPerRequest: null });
  });

  after(async () => {
    const keys = await redis.keys(`rl:${prefix}:*`);
    if (keys.length) await redis.del(...keys);
    await redis.quit();
  });

  it("increments across calls with shared TTL window", async () => {
    const store = createRedisRateLimitStore(prefix, { redis });
    store.init?.({ windowMs: 5_000 } as never);
    const a = await store.increment("ip:1");
    const b = await store.increment("ip:1");
    assert.equal(a.totalHits, 1);
    assert.equal(b.totalHits, 2);
    assert.ok(b.resetTime instanceof Date);
  });

  it("shares counters for the same key (multi-process simulation)", async () => {
    const storeA = createRedisRateLimitStore(prefix, { redis });
    const storeB = createRedisRateLimitStore(prefix, { redis });
    storeA.init?.({ windowMs: 5_000 } as never);
    storeB.init?.({ windowMs: 5_000 } as never);
    await storeA.increment("shared");
    await storeA.increment("shared");
    const fromB = await storeB.increment("shared");
    assert.equal(fromB.totalHits, 3);
  });
});
