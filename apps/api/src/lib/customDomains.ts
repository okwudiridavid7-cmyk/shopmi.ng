import crypto from "crypto";
import dns from "dns";
import { prisma } from "../db/prisma";
import { env } from "../config/env";

/** Two-label public suffixes common for our sellers; the zone apex sits one label above. */
const MULTI_LABEL_SUFFIXES = new Set([
  "com.ng", "org.ng", "net.ng", "edu.ng", "gov.ng", "name.ng", "sch.ng", "mil.ng",
  "co.uk", "org.uk", "me.uk", "ltd.uk", "plc.uk",
  "co.za", "org.za", "com.gh", "org.gh", "co.ke", "or.ke",
  "com.au", "net.au", "org.au", "co.nz", "com.br", "co.in", "com.sg",
]);

export const TXT_PREFIX = "_shopmi";
const TXT_VALUE_PREFIX = "shopmi-verify=";

export class DomainInputError extends Error {}

function platformHostnames(): string[] {
  const hosts = new Set<string>();
  const base = env.shopBaseDomain.split(":")[0]?.toLowerCase();
  if (base) hosts.add(base);
  try {
    hosts.add(new URL(env.webUrl).hostname.toLowerCase());
    hosts.add(new URL(env.apiUrl).hostname.toLowerCase());
  } catch {
    /* ignore bad URLs */
  }
  return [...hosts];
}

/** Lowercase bare hostname from whatever the seller typed, or throw a friendly error. */
export function normalizeDomain(input: string): string {
  let d = input.trim().toLowerCase();
  d = d.replace(/^[a-z]+:\/\//, "");
  d = d.split(/[/?#]/)[0] ?? "";
  d = d.split(":")[0] ?? "";
  d = d.replace(/\.$/, "");

  if (!d) throw new DomainInputError("Enter a domain like shop.yourbrand.com.");
  if (d.length > 253) throw new DomainInputError("That domain is too long.");
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(d)) {
    throw new DomainInputError("Use a domain name, not an IP address.");
  }
  const labels = d.split(".");
  if (labels.length < 2) {
    throw new DomainInputError("Enter a full domain like shop.yourbrand.com.");
  }
  const labelOk = /^(?!-)[a-z0-9-]{1,63}(?<!-)$/;
  if (!labels.every((l) => labelOk.test(l)) || !/^[a-z]{2,63}$/.test(labels.at(-1)!)) {
    throw new DomainInputError("That doesn't look like a valid domain.");
  }
  for (const host of platformHostnames()) {
    if (host && (d === host || d.endsWith(`.${host}`))) {
      throw new DomainInputError("Use a domain you own, not a Shopmi.ng address.");
    }
  }
  if (d === "localhost" || d.endsWith(".localhost") || d.endsWith(".onrender.com")) {
    throw new DomainInputError("Use a domain you own.");
  }
  return d;
}

/** Registrable domain (zone apex) for a hostname, e.g. shop.brand.com.ng -> brand.com.ng. */
export function zoneApex(domain: string): string {
  const labels = domain.split(".");
  const lastTwo = labels.slice(-2).join(".");
  const size = MULTI_LABEL_SUFFIXES.has(lastTwo) ? 3 : 2;
  return labels.slice(-size).join(".");
}

export function isApexDomain(domain: string): boolean {
  return zoneApex(domain) === domain;
}

/** Record name relative to the zone, as most DNS dashboards expect ("@" for the apex). */
function relativeName(fqdn: string, apex: string): string {
  if (fqdn === apex) return "@";
  return fqdn.slice(0, -(apex.length + 1));
}

/** Shop's address on the platform (subdomain, or /shops/:slug when there's no shop base domain). */
export function platformShopUrl(slug: string): string {
  const base = env.shopBaseDomain.trim().toLowerCase();
  const baseHost = base.split(":")[0] ?? "";
  if (!baseHost || baseHost === "localhost" || baseHost === "127.0.0.1") {
    return `${env.webUrl.replace(/\/$/, "")}/shops/${slug}`;
  }
  const proto = env.isProd ? "https" : "http";
  return `${proto}://${slug}.${base}`;
}

export function newDomainToken(): string {
  return crypto.randomBytes(12).toString("hex");
}

export type DnsRecord = {
  purpose: "routing" | "ownership";
  type: "A" | "CNAME" | "TXT";
  name: string;
  fqdn: string;
  value: string;
};

export function requiredRecords(domain: string, token: string): DnsRecord[] {
  const apex = zoneApex(domain);
  const routing: DnsRecord = isApexDomain(domain)
    ? {
        purpose: "routing",
        type: "A",
        name: "@",
        fqdn: domain,
        value: env.customDomainARecord,
      }
    : {
        purpose: "routing",
        type: "CNAME",
        name: relativeName(domain, apex),
        fqdn: domain,
        value: env.customDomainCnameTarget,
      };
  const txtFqdn = `${TXT_PREFIX}.${domain}`;
  return [
    routing,
    {
      purpose: "ownership",
      type: "TXT",
      name: relativeName(txtFqdn, apex),
      fqdn: txtFqdn,
      value: `${TXT_VALUE_PREFIX}${token}`,
    },
  ];
}

function resolver() {
  const r = new dns.promises.Resolver({ timeout: 4000, tries: 2 });
  r.setServers(["1.1.1.1", "8.8.8.8"]);
  return r;
}

const stripDot = (s: string) => s.toLowerCase().replace(/\.$/, "");

export type DnsCheck = {
  ownership: boolean;
  routing: boolean;
  found: { txt: string[]; cname: string[]; a: string[]; aaaa: string[] };
};

export async function checkDomainDns(domain: string, token: string): Promise<DnsCheck> {
  const r = resolver();
  const [txt, cname, a, aaaa, targetIps] = await Promise.all([
    r.resolveTxt(`${TXT_PREFIX}.${domain}`).then((rows) => rows.map((c) => c.join(""))).catch(() => []),
    r.resolveCname(domain).then((v) => v.map(stripDot)).catch(() => [] as string[]),
    r.resolve4(domain).catch(() => [] as string[]),
    r.resolve6(domain).catch(() => [] as string[]),
    r.resolve4(env.customDomainCnameTarget).catch(() => [] as string[]),
  ]);

  const ownership = txt.some((v) => v.trim() === `${TXT_VALUE_PREFIX}${token}`);
  const target = stripDot(env.customDomainCnameTarget);
  const routing =
    cname.includes(target) ||
    a.includes(env.customDomainARecord) ||
    (a.length > 0 && a.every((ip) => targetIps.includes(ip)));

  return { ownership, routing, found: { txt, cname, a, aaaa } };
}

/* ---------------- Render (TLS + routing on the web service) ---------------- */

export function hostingManaged(): boolean {
  return !!(env.renderApiKey && env.renderWebServiceId);
}

async function renderRequest(method: string, path: string, body?: unknown) {
  const res = await fetch(
    `https://api.render.com/v1/services/${env.renderWebServiceId}/custom-domains${path}`,
    {
      method,
      headers: {
        Authorization: `Bearer ${env.renderApiKey}`,
        Accept: "application/json",
        ...(body ? { "Content-Type": "application/json" } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    }
  );
  const text = await res.text();
  let data: unknown = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }
  return { ok: res.ok, status: res.status, data };
}

export type HostingStatus = "verified" | "unverified" | "missing" | "error";

export async function hostingStatus(domain: string): Promise<HostingStatus> {
  if (!hostingManaged()) return "verified";
  try {
    const res = await renderRequest("GET", `/${encodeURIComponent(domain)}`);
    if (res.status === 404) return "missing";
    if (!res.ok) return "error";
    const status = (res.data as { verificationStatus?: string } | null)?.verificationStatus;
    return status === "verified" ? "verified" : "unverified";
  } catch {
    return "error";
  }
}

/** Attach the domain to the web service and ask Render to verify it (which issues TLS). */
export async function attachToHosting(domain: string): Promise<HostingStatus> {
  if (!hostingManaged()) return "verified";
  try {
    let current = await hostingStatus(domain);
    if (current === "missing") {
      const created = await renderRequest("POST", "", { name: domain });
      if (!created.ok && created.status !== 409) {
        console.warn("[domains] render add failed", created.status, created.data);
        return "error";
      }
      current = "unverified";
    }
    if (current === "unverified") {
      await renderRequest("POST", `/${encodeURIComponent(domain)}/verify`);
      current = await hostingStatus(domain);
    }
    return current;
  } catch (err) {
    console.warn("[domains] render attach failed", err);
    return "error";
  }
}

export async function detachFromHosting(domain: string): Promise<void> {
  if (!hostingManaged()) return;
  try {
    const res = await renderRequest("DELETE", `/${encodeURIComponent(domain)}`);
    if (!res.ok && res.status !== 404) {
      console.warn("[domains] render delete failed", res.status, res.data);
    }
  } catch (err) {
    console.warn("[domains] render delete failed", err);
  }
}

/* ---------------- Assignment ---------------- */

export class DomainConflictError extends Error {}

/** Point the shop at a domain (or clear it). New domains start unverified with a fresh token. */
export async function setTenantDomain(
  tenantId: string,
  domain: string | null
): Promise<{ changed: boolean; token: string | null }> {
  const current = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: { customDomain: true, customDomainToken: true },
  });
  if (current?.customDomain === domain) {
    return { changed: false, token: current?.customDomainToken ?? null };
  }
  if (domain) {
    const taken = await prisma.tenant.findFirst({
      where: { customDomain: domain, NOT: { id: tenantId } },
      select: { id: true },
    });
    if (taken) throw new DomainConflictError("That domain is already linked to another shop.");
  }
  const token = domain ? newDomainToken() : null;
  await prisma.tenant.update({
    where: { id: tenantId },
    data: {
      customDomain: domain,
      customDomainToken: token,
      customDomainVerifiedAt: null,
      customDomainCheckedAt: null,
      customDomainError: null,
    },
  });
  if (current?.customDomain) {
    invalidateDomainCache(current.customDomain);
    await detachFromHosting(current.customDomain);
  }
  return { changed: true, token };
}

/* ---------------- Verification flow ---------------- */

function failureMessage(check: DnsCheck, domain: string): string {
  const parts: string[] = [];
  if (!check.routing) {
    parts.push(
      isApexDomain(domain)
        ? `${domain} doesn't point to ${env.customDomainARecord} yet.`
        : `${domain} doesn't point to ${env.customDomainCnameTarget} yet.`
    );
  }
  if (!check.ownership) {
    parts.push(`The TXT record at ${TXT_PREFIX}.${domain} isn't visible yet.`);
  }
  if (check.found.aaaa.length) {
    parts.push("Remove the AAAA (IPv6) records on this domain.");
  }
  return parts.join(" ");
}

export type VerifyResult = {
  verified: boolean;
  check: DnsCheck | null;
  hosting: HostingStatus | null;
  error: string | null;
};

/** Check DNS for a tenant's pending domain; mark verified and attach to hosting on success. */
export async function verifyTenantDomain(tenantId: string): Promise<VerifyResult> {
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: {
      customDomain: true,
      customDomainToken: true,
      customDomainVerifiedAt: true,
    },
  });
  if (!tenant?.customDomain) {
    return { verified: false, check: null, hosting: null, error: "No domain set." };
  }
  const domain = tenant.customDomain;
  let token = tenant.customDomainToken;
  if (!token) {
    token = newDomainToken();
    await prisma.tenant.update({ where: { id: tenantId }, data: { customDomainToken: token } });
  }

  const check = await checkDomainDns(domain, token);
  const now = new Date();

  if (!tenant.customDomainVerifiedAt && !(check.ownership && check.routing)) {
    const error = failureMessage(check, domain);
    await prisma.tenant.updateMany({
      where: { id: tenantId, customDomain: domain },
      data: { customDomainCheckedAt: now, customDomainError: error },
    });
    return { verified: false, check, hosting: null, error };
  }

  const hosting = await attachToHosting(domain);
  await prisma.tenant.updateMany({
    where: { id: tenantId, customDomain: domain },
    data: {
      customDomainVerifiedAt: tenant.customDomainVerifiedAt ?? now,
      customDomainCheckedAt: now,
      // Non-null keeps the domain in the hourly retry until the certificate is issued.
      customDomainError:
        hosting === "verified"
          ? null
          : hosting === "error"
            ? "We couldn't finish securing this domain. We'll retry within the hour."
            : "Issuing the SSL certificate. This usually takes a few minutes.",
    },
  });
  invalidateDomainCache(domain);
  return { verified: true, check, hosting, error: null };
}

/** Hourly: retry pending domains and nudge hosting for verified ones still waiting on TLS. */
export async function checkPendingDomains(): Promise<{ checked: number; verified: number }> {
  const staleBefore = new Date(Date.now() - 50 * 60 * 1000);
  const tenants = await prisma.tenant.findMany({
    where: {
      customDomain: { not: null },
      OR: [{ customDomainCheckedAt: null }, { customDomainCheckedAt: { lt: staleBefore } }],
      AND: [
        {
          OR: [
            { customDomainVerifiedAt: null },
            { customDomainError: { not: null } },
          ],
        },
      ],
    },
    select: { id: true },
    take: 200,
  });
  let verified = 0;
  for (const t of tenants) {
    try {
      const res = await verifyTenantDomain(t.id);
      if (res.verified) verified += 1;
    } catch (err) {
      console.warn("[domains] check failed", t.id, err);
    }
  }
  return { checked: tenants.length, verified };
}

/* ---------------- CORS lookup ---------------- */

const originCache = new Map<string, { ok: boolean; exp: number }>();

export function invalidateDomainCache(domain?: string | null) {
  if (domain) originCache.delete(domain);
  else originCache.clear();
}

/** True when the hostname is a verified seller domain (cached briefly for CORS). */
export async function isVerifiedCustomDomain(hostname: string): Promise<boolean> {
  const host = hostname.toLowerCase();
  const hit = originCache.get(host);
  if (hit && hit.exp > Date.now()) return hit.ok;
  const tenant = await prisma.tenant.findFirst({
    where: { customDomain: host, customDomainVerifiedAt: { not: null } },
    select: { id: true },
  });
  const ok = !!tenant;
  originCache.set(host, { ok, exp: Date.now() + (ok ? 5 : 1) * 60 * 1000 });
  return ok;
}
