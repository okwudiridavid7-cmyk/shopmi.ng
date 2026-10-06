#!/usr/bin/env tsx
/**
 * Read-only production smoke checks for shopmi.ng.
 * Usage: pnpm exec tsx scripts/smoke-production.ts
 * Optional: SMOKE_BASE=https://shopmi.ng SMOKE_API=https://api.shopmi.ng
 */
const WEB = (process.env.SMOKE_BASE ?? "https://shopmi.ng").replace(/\/$/, "");
const API = (process.env.SMOKE_API ?? "https://api.shopmi.ng").replace(/\/$/, "");
const MEDIA = (process.env.SMOKE_MEDIA ?? "https://media.shopmi.ng").replace(/\/$/, "");

type Check = { name: string; ok: boolean; detail?: string };

type Fetched = { ok: boolean; status: number; ct?: string; headers?: Headers };

async function fetchOk(url: string, init?: RequestInit): Promise<Fetched> {
  try {
    const res = await fetch(url, {
      ...init,
      redirect: "follow",
      signal: AbortSignal.timeout(20_000),
    });
    return { ok: res.ok, status: res.status, ct: res.headers.get("content-type") ?? undefined, headers: res.headers };
  } catch (err) {
    return { ok: false, status: 0, ct: err instanceof Error ? err.message : "error" };
  }
}

async function tlsOk(hostname: string): Promise<boolean> {
  try {
    const res = await fetch(`https://${hostname}/`, {
      method: "HEAD",
      redirect: "manual",
      signal: AbortSignal.timeout(15_000),
    });
    return res.status > 0 && res.status < 500;
  } catch {
    return false;
  }
}

async function main() {
  const checks: Check[] = [];

  for (const host of ["shopmi.ng", "www.shopmi.ng", "api.shopmi.ng", "media.shopmi.ng"]) {
    checks.push({ name: `TLS ${host}`, ok: await tlsOk(host) });
  }

  const health = await fetchOk(`${API}/health`);
  checks.push({ name: "API /health", ok: health.ok, detail: `status ${health.status}` });

  const catalog = await fetchOk(`${API}/api/catalog/categories?tree=1`);
  checks.push({
    name: "API catalog",
    ok: catalog.ok && (catalog.ct ?? "").includes("json"),
    detail: `status ${catalog.status}`,
  });

  const plans = await fetchOk(`${API}/api/plans`);
  checks.push({
    name: "API plans",
    ok: plans.ok,
    detail: `status ${plans.status}`,
  });

  const settings = await fetchOk(`${API}/api/platform-settings`);
  checks.push({
    name: "API admin settings need auth",
    ok: settings.status === 401,
    detail: `status ${settings.status}`,
  });

  const home = await fetchOk(`${WEB}/`);
  checks.push({ name: "Web home", ok: home.ok, detail: `status ${home.status}` });
  checks.push({
    name: "Web sends a Content-Security-Policy",
    ok: Boolean(home.headers?.get("content-security-policy")),
  });

  const pricing = await fetchOk(`${WEB}/pricing`);
  checks.push({ name: "Web pricing", ok: pricing.ok, detail: `status ${pricing.status}` });

  const media = await fetchOk(`${MEDIA}/`, { method: "HEAD" });
  checks.push({
    name: "Media origin responds",
    ok: media.status > 0 && media.status < 500,
    detail: `status ${media.status}`,
  });

  let failed = 0;
  for (const c of checks) {
    const mark = c.ok ? "ok" : "FAIL";
    if (!c.ok) failed += 1;
    console.log(`${mark.padEnd(4)} ${c.name}${c.detail ? ` (${c.detail})` : ""}`);
  }
  if (failed) {
    console.error(`\n${failed} check(s) failed`);
    process.exit(1);
  }
  console.log(`\nAll ${checks.length} smoke checks passed`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
