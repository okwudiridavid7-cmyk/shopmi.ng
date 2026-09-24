import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  CATALOG_STATS_CACHE_KEY,
  getCatalogStats,
  type CatalogStats,
} from "./catalogStats";

function memoryRedis(seed?: Record<string, string>) {
  const store = new Map<string, string>(Object.entries(seed ?? {}));
  const sets: { key: string; value: string; ex?: number }[] = [];
  return {
    store,
    sets,
    redis: {
      async get(key: string) {
        return store.get(key) ?? null;
      },
      async set(key: string, value: string, mode?: string, ttl?: number) {
        store.set(key, value);
        sets.push({
          key,
          value,
          ex: mode === "EX" ? ttl : undefined,
        });
        return "OK" as const;
      },
    },
  };
}

describe("getCatalogStats (REM-13)", () => {
  it("returns cached JSON without calling load", async () => {
    const cached: CatalogStats = {
      shopCount: 1,
      productCount: 2,
      orderCount: 3,
    };
    const { redis } = memoryRedis({
      [CATALOG_STATS_CACHE_KEY]: JSON.stringify(cached),
    });
    let loads = 0;
    const stats = await getCatalogStats({
      redis,
      load: async () => {
        loads += 1;
        return { shopCount: 9, productCount: 9, orderCount: 9 };
      },
    });
    assert.deepEqual(stats, cached);
    assert.equal(loads, 0);
  });

  it("loads once and writes cache with TTL on miss", async () => {
    const { redis, sets } = memoryRedis();
    let loads = 0;
    const fresh: CatalogStats = {
      shopCount: 10,
      productCount: 20,
      orderCount: 30,
    };
    const first = await getCatalogStats({
      redis,
      ttlSec: 90,
      load: async () => {
        loads += 1;
        return fresh;
      },
    });
    const second = await getCatalogStats({
      redis,
      load: async () => {
        loads += 1;
        return { shopCount: 0, productCount: 0, orderCount: 0 };
      },
    });
    assert.deepEqual(first, fresh);
    assert.deepEqual(second, fresh);
    assert.equal(loads, 1);
    assert.equal(sets.length, 1);
    assert.equal(sets[0]?.key, CATALOG_STATS_CACHE_KEY);
    assert.equal(sets[0]?.ex, 90);
  });

  it("falls through when redis get fails", async () => {
    const stats = await getCatalogStats({
      redis: {
        async get() {
          throw new Error("redis down");
        },
        async set() {
          throw new Error("redis down");
        },
      },
      load: async () => ({
        shopCount: 4,
        productCount: 5,
        orderCount: 6,
      }),
    });
    assert.deepEqual(stats, {
      shopCount: 4,
      productCount: 5,
      orderCount: 6,
    });
  });
});
