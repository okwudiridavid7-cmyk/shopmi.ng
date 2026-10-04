import crypto from "crypto";
import { Resolver } from "dns/promises";
import { env } from "../config/env";

export type RegistrantContact = {
  firstName: string;
  lastName: string;
  company?: string | null;
  email: string;
  /** E.164, e.g. +2348012345678. */
  phone: string;
  address: string;
  city: string;
  state: string;
  /** ISO 3166-1 alpha-2. */
  country: string;
  postcode?: string | null;
};

export type LookupResult = {
  domain: string;
  tld: string;
  /** null when the registrar's answer couldn't be read; treat as not for sale. */
  available: boolean | null;
};

export type ManagedDnsRecord = {
  type: "A" | "CNAME" | "TXT";
  /** Relative host: "@", "www", "_shopmi". */
  name: string;
  value: string;
};

export interface Registrar {
  id: "go54" | "dev";
  lookup(sld: string, tlds: string[]): Promise<LookupResult[]>;
  register(input: {
    domain: string;
    years: number;
    contact: RegistrantContact;
  }): Promise<{ ref: string | null }>;
  renew(domain: string, years: number): Promise<void>;
  setDnsRecords(domain: string, records: ManagedDnsRecord[]): Promise<void>;
}

export class RegistrarError extends Error {}

// ---- GO54 (WhoGoHost) Domains Reseller API ---------------------------------

/** base64(hex HMAC-SHA256(apiKey, key = "email:yy-mm-dd HH" in UTC)), matching the PHP reference. */
function go54Token(email: string, apiKey: string, now = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  const stamp = `${String(now.getUTCFullYear()).slice(2)}-${pad(now.getUTCMonth() + 1)}-${pad(
    now.getUTCDate()
  )} ${pad(now.getUTCHours())}`;
  const hex = crypto.createHmac("sha256", `${email}:${stamp}`).update(apiKey).digest("hex");
  return Buffer.from(hex).toString("base64");
}

/** PHP http_build_query-style body: nested objects/arrays become key[sub]=value. */
function phpForm(data: Record<string, unknown>): string {
  const pairs: string[] = [];
  const walk = (value: unknown, key: string) => {
    if (value === undefined || value === null) return;
    if (Array.isArray(value)) {
      value.forEach((v, i) => walk(v, `${key}[${i}]`));
    } else if (typeof value === "object") {
      for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
        walk(v, `${key}[${k}]`);
      }
    } else {
      const v = typeof value === "boolean" ? (value ? "1" : "0") : String(value);
      pairs.push(`${encodeURIComponent(key)}=${encodeURIComponent(v)}`);
    }
  };
  for (const [k, v] of Object.entries(data)) walk(v, k);
  return pairs.join("&");
}

type Go54Response = Record<string, unknown> | unknown[];

async function go54Call(
  method: "GET" | "POST",
  action: string,
  params: Record<string, unknown> = {}
): Promise<Go54Response> {
  const headers: Record<string, string> = {
    username: env.go54ApiEmail,
    token: go54Token(env.go54ApiEmail, env.go54ApiKey),
    action,
    Accept: "application/json",
  };
  let url = `${env.go54ApiUrl}${action}`;
  let body: string | undefined;
  if (method === "GET") {
    const qs = phpForm(params);
    if (qs) url += `?${qs}`;
  } else {
    headers["Content-Type"] = "application/x-www-form-urlencoded";
    body = phpForm(params);
  }

  const res = await fetch(url, { method, headers, body, signal: AbortSignal.timeout(30_000) });
  const text = await res.text();
  let json: Go54Response;
  try {
    json = JSON.parse(text) as Go54Response;
  } catch {
    throw new RegistrarError(`Registrar returned an unreadable response (${res.status}).`);
  }
  const obj = Array.isArray(json) ? null : json;
  const failed =
    !res.ok ||
    (obj && (obj.result === "error" || obj.status === "error" || typeof obj.error === "string"));
  if (failed) {
    const message =
      (obj && (obj.message || obj.msg || obj.error)) || `Registrar request failed (${res.status}).`;
    throw new RegistrarError(String(message));
  }
  return json;
}

function listFrom(json: Go54Response): Record<string, unknown>[] {
  if (Array.isArray(json)) return json as Record<string, unknown>[];
  for (const key of ["data", "results", "domains", "records", "dnsrecords"]) {
    const v = json[key];
    if (Array.isArray(v)) return v as Record<string, unknown>[];
    if (v && typeof v === "object") return Object.values(v) as Record<string, unknown>[];
  }
  return Object.values(json).filter(
    (v): v is Record<string, unknown> => !!v && typeof v === "object"
  );
}

function availabilityOf(entry: Record<string, unknown>): boolean | null {
  if (entry.isPremium === true || entry.premium === true) return false;
  if (typeof entry.isAvailable === "boolean") return entry.isAvailable;
  if (typeof entry.available === "boolean") return entry.available;
  const s = String(entry.status ?? entry.legacyStatus ?? entry.availability ?? "").toLowerCase();
  if (!s) return null;
  if (/unavailable|registered|taken|reserved|in use/.test(s)) return false;
  if (/available|free/.test(s)) return true;
  return null;
}

function entryDomain(entry: Record<string, unknown>): string | null {
  const d = entry.domainName ?? entry.domain ?? entry.name ?? entry.idnDomainName;
  return typeof d === "string" ? d.toLowerCase() : null;
}

function go54Contact(c: RegistrantContact) {
  const digits = c.phone.replace(/[^\d+]/g, "");
  const phone = digits.startsWith("+234")
    ? `+234.${digits.slice(4)}`
    : digits.startsWith("+")
      ? `${digits.slice(0, 4)}.${digits.slice(4)}`
      : digits;
  return {
    firstname: c.firstName,
    lastname: c.lastName,
    fullname: `${c.firstName} ${c.lastName}`.trim(),
    companyname: c.company ?? "",
    email: c.email,
    address1: c.address,
    address2: "",
    city: c.city,
    state: c.state,
    zipcode: c.postcode || "100001",
    postcode: c.postcode || "100001",
    country: c.country,
    phonenumber: phone,
  };
}

const go54: Registrar = {
  id: "go54",

  async lookup(sld, tlds) {
    const json = await go54Call("POST", "/domains/lookup", {
      searchTerm: sld,
      punyCodeSearchTerm: sld,
      tldsToInclude: tlds.map((t) => `.${t}`),
      isIdnDomain: false,
      premiumEnabled: false,
    });
    const byDomain = new Map<string, boolean | null>();
    for (const entry of listFrom(json)) {
      const d = entryDomain(entry);
      if (d) byDomain.set(d, availabilityOf(entry));
    }
    return tlds.map((tld) => {
      const domain = `${sld}.${tld}`;
      return { domain, tld, available: byDomain.get(domain) ?? null };
    });
  },

  async register({ domain, years, contact }) {
    const person = go54Contact(contact);
    const [ns1, ns2, ns3, ns4] = env.go54Nameservers;
    const json = await go54Call("POST", "/order/domains/register", {
      domain,
      regperiod: years,
      nameservers: { ns1, ns2, ns3, ns4 },
      addons: { dnsmanagement: 1, emailforwarding: 0, idprotection: 0 },
      contacts: { registrant: person, admin: person, tech: person, billing: person },
    });
    const obj = Array.isArray(json) ? {} : json;
    const data = (obj.data ?? {}) as Record<string, unknown>;
    const ref = data.orderid ?? data.orderId ?? obj.orderid ?? null;
    return { ref: ref != null ? String(ref) : null };
  },

  async renew(domain, years) {
    await go54Call("POST", "/order/domains/renew", { domain, regperiod: years });
  },

  async setDnsRecords(domain, records) {
    let existing: Record<string, unknown>[] = [];
    try {
      existing = listFrom(await go54Call("GET", `/domains/${encodeURIComponent(domain)}/dns`));
    } catch {
      existing = [];
    }
    const ours = new Set(records.map((r) => `${r.type}:${r.name}`));
    const kept = existing
      .map((r) => ({
        hostname: String(r.hostname ?? r.name ?? ""),
        type: String(r.type ?? "").toUpperCase(),
        address: String(r.address ?? r.value ?? ""),
        priority: Number(r.priority ?? 0) || 0,
        recid: String(r.recid ?? r.id ?? ""),
      }))
      .filter((r) => r.hostname && r.type && !ours.has(`${r.type}:${r.hostname}`))
      // The shop answers on @ and www; stale records there would compete with ours.
      .filter((r) => !((r.hostname === "@" || r.hostname === "www") && ["A", "AAAA", "CNAME"].includes(r.type)));
    const dnsrecords = [
      ...kept,
      ...records.map((r) => ({ hostname: r.name, type: r.type, address: r.value, priority: 0, recid: "" })),
    ];
    await go54Call("POST", `/domains/${encodeURIComponent(domain)}/dns`, { domain, dnsrecords });
  },
};

// ---- Development stand-in ---------------------------------------------------

/** A name with published nameservers is registered; NXDOMAIN means it's free. Good enough locally. */
async function nsExists(domain: string): Promise<boolean | null> {
  const r = new Resolver({ timeout: 4000, tries: 1 });
  r.setServers(["1.1.1.1", "8.8.8.8"]);
  try {
    const ns = await r.resolveNs(domain);
    return ns.length > 0;
  } catch (err) {
    const code = (err as NodeJS.ErrnoException).code;
    if (code === "ENOTFOUND") return false;
    if (code === "ENODATA") return true;
    return null;
  }
}

const dev: Registrar = {
  id: "dev",
  async lookup(sld, tlds) {
    return Promise.all(
      tlds.map(async (tld) => {
        const domain = `${sld}.${tld}`;
        const exists = await nsExists(domain);
        return { domain, tld, available: exists == null ? null : !exists };
      })
    );
  },
  async register({ domain, years }) {
    console.log(`[registrar:dev] pretend-registered ${domain} for ${years}y`);
    return { ref: `dev-${Date.now()}` };
  },
  async renew(domain, years) {
    console.log(`[registrar:dev] pretend-renewed ${domain} for ${years}y`);
  },
  async setDnsRecords(domain, records) {
    console.log(
      `[registrar:dev] would set DNS for ${domain}: ${records.map((r) => `${r.type} ${r.name} ${r.value}`).join("; ")}`
    );
  },
};

/** GO54 when configured; the stand-in outside production; otherwise purchases are off. */
export function getRegistrar(): Registrar | null {
  if (env.go54ApiEmail && env.go54ApiKey) return go54;
  if (!env.isProd) return dev;
  return null;
}
