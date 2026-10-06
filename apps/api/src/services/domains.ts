import { Prisma, type RegisteredDomain } from "@prisma/client";
import { z } from "zod";
import { prisma } from "../db/prisma";
import { env } from "../config/env";
import { getPlatformSetting } from "../lib/platformSettings";
import { planAllows } from "../lib/plans";
import {
  DomainInputError,
  requiredRecords,
  setTenantDomain,
  verifyTenantDomain,
} from "../lib/customDomains";
import { getDomainsQueue } from "../queue/connection";
import { enqueueTransactionalMail } from "../queue/transactionalMail";
import { getRegistrar, type ManagedDnsRecord, type RegistrantContact } from "./registrar";
import { alertAdmins } from "./adminAlerts";
import {
  PaystackError,
  initializeTransaction,
  newReference,
  paystackConfigured,
  refundTransaction,
  toMinorUnits,
  verifyTransaction,
} from "./paystack";

export class DomainPurchaseError extends Error {
  constructor(
    message: string,
    public status = 400,
    public code?: string
  ) {
    super(message);
  }
}

/* ---------------- Retail pricing (platform setting) ---------------- */

export const FREE_TLD = "com.ng";
export const PAYMENT_PREFIX = "dom_";
const DAY = 24 * 60 * 60 * 1000;

export type TldPrice = { tld: string; register: number; renew: number; enabled: boolean };

/** Placeholder retail prices (NGN / year); admins set real ones in Settings. */
export const DEFAULT_DOMAIN_PRICING: TldPrice[] = [
  { tld: "com.ng", register: 7500, renew: 7500, enabled: true },
  { tld: "ng", register: 25000, renew: 25000, enabled: true },
  { tld: "com", register: 22000, renew: 22000, enabled: true },
  { tld: "org.ng", register: 7500, renew: 7500, enabled: true },
  { tld: "net", register: 25000, renew: 25000, enabled: true },
  { tld: "org", register: 25000, renew: 25000, enabled: true },
];

export const tldPriceSchema = z.object({
  tld: z
    .string()
    .trim()
    .toLowerCase()
    .transform((s) => s.replace(/^\./, ""))
    .pipe(z.string().regex(/^[a-z]{2,63}(\.[a-z]{2,63})?$/, "Invalid TLD")),
  register: z.coerce.number().min(0).max(10_000_000),
  renew: z.coerce.number().min(0).max(10_000_000),
  enabled: z.boolean(),
});

export async function getDomainPricing(): Promise<TldPrice[]> {
  const raw = await getPlatformSetting("domain_pricing", "");
  if (!raw) return DEFAULT_DOMAIN_PRICING;
  try {
    const parsed = z.array(tldPriceSchema).parse(JSON.parse(raw));
    return parsed.length ? parsed : DEFAULT_DOMAIN_PRICING;
  } catch {
    return DEFAULT_DOMAIN_PRICING;
  }
}

async function enabledPricing(): Promise<TldPrice[]> {
  return (await getDomainPricing()).filter((p) => p.enabled && p.register > 0);
}

/* ---------------- Eligibility ---------------- */

/**
 * The free .com.ng comes with a paid period, not a trial: the plan must include it,
 * the shop must not be on trial, and it must have paid (online, or a period set by an admin).
 */
export async function freeDomainEligible(tenantId: string, db: Prisma.TransactionClient = prisma): Promise<boolean> {
  if (!(await planAllows(tenantId, "freeDomain"))) return false;
  const tenant = await db.tenant.findUnique({
    where: { id: tenantId },
    select: { trialEndsAt: true, planExpiresAt: true },
  });
  if (!tenant || tenant.trialEndsAt) return false;
  if (!tenant.planExpiresAt || tenant.planExpiresAt.getTime() <= Date.now()) {
    const paid = await db.planPayment.count({ where: { tenantId, status: "paid" } });
    if (!paid) return false;
  }
  const existing = await db.registeredDomain.count({
    where: { tenantId, free: true, status: { in: ["registering", "active"] } },
  });
  return existing === 0;
}

/* ---------------- Search ---------------- */

export function parseDomainQuery(
  raw: string,
  tlds: string[]
): { sld: string; tld: string | null } {
  let q = raw.trim().toLowerCase().replace(/^[a-z]+:\/\//, "");
  q = (q.split(/[/?#]/)[0] ?? "").replace(/\s+/g, "").replace(/^www\./, "").replace(/\.$/, "");
  if (!q) throw new DomainInputError("Type a name to search for.");
  let sld = q;
  let tld: string | null = null;
  const dot = q.indexOf(".");
  if (dot >= 0) {
    sld = q.slice(0, dot);
    tld = q.slice(dot + 1);
    if (!tlds.includes(tld)) {
      throw new DomainInputError(
        `We don't offer .${tld} yet. Try ${tlds.map((t) => `.${t}`).join(", ")}.`
      );
    }
  }
  if (sld.length < 2 || sld.length > 63) {
    throw new DomainInputError("Names must be between 2 and 63 characters.");
  }
  if (!/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/.test(sld)) {
    throw new DomainInputError(
      "Use only letters, numbers and hyphens, without a hyphen at the start or end."
    );
  }
  return { sld, tld };
}

export type DomainOption = {
  domain: string;
  tld: string;
  available: boolean;
  price: number;
  renewPrice: number;
  free: boolean;
};

export async function searchDomains(tenantId: string, raw: string) {
  const registrar = getRegistrar();
  if (!registrar) {
    throw new DomainPurchaseError("Domain search isn't available right now.", 503);
  }
  const pricing = await enabledPricing();
  const tlds = pricing.map((p) => p.tld);
  const { sld, tld } = parseDomainQuery(raw, tlds);
  const free = await freeDomainEligible(tenantId);
  const priceOf = new Map(pricing.map((p) => [p.tld, p]));

  const ordered = tld ? [tld, ...tlds.filter((t) => t !== tld)] : tlds;
  const results = await registrar.lookup(sld, ordered);

  // Names already held on the platform are off the table even if the registry lags.
  const held = new Set(
    (
      await prisma.registeredDomain.findMany({
        where: {
          domain: { in: results.map((r) => r.domain) },
          status: { in: ["registering", "active"] },
        },
        select: { domain: true },
      })
    ).map((r) => r.domain)
  );

  const toOption = (r: { domain: string; tld: string; available: boolean | null }): DomainOption => {
    const p = priceOf.get(r.tld)!;
    return {
      domain: r.domain,
      tld: r.tld,
      available: r.available === true && !held.has(r.domain),
      price: p.register,
      renewPrice: p.renew,
      free: free && r.tld === FREE_TLD,
    };
  };
  const options = results.map(toOption);
  const exact = options[0]!;

  let suggestions: DomainOption[] = [];
  if (!exact.available) {
    const base = ordered[0]!;
    const variants = [`${sld}shop`, `${sld}ng`, `shop${sld}`, `get${sld}`]
      .filter((v) => v.length <= 63)
      .slice(0, 3);
    const found = await Promise.all(
      variants.map((v) => registrar.lookup(v, [base]).then((r) => r[0]!).catch(() => null))
    );
    suggestions = found
      .filter((r): r is NonNullable<typeof r> => !!r)
      .map(toOption)
      .filter((o) => o.available);
  }

  return {
    query: exact.domain,
    exact,
    results: options.slice(1).filter((o) => o.available),
    suggestions,
  };
}

/* ---------------- Purchase ---------------- */

export const registrantSchema = z.object({
  firstName: z.string().trim().min(1, "First name is required").max(60),
  lastName: z.string().trim().min(1, "Last name is required").max(60),
  company: z.string().trim().max(120).optional().nullable(),
  email: z.string().trim().email("Enter a valid email"),
  phone: z
    .string()
    .trim()
    .transform((s) => s.replace(/[\s()-]/g, ""))
    .transform((s) => (s.startsWith("0") ? `+234${s.slice(1)}` : s))
    .pipe(z.string().regex(/^\+\d{8,15}$/, "Enter a phone number like +2348012345678")),
  address: z.string().trim().min(3, "Address is required").max(200),
  city: z.string().trim().min(2, "City is required").max(80),
  state: z.string().trim().min(2, "State is required").max(80),
  country: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z]{2}$/, "Use a 2-letter country code"),
  postcode: z.string().trim().max(20).optional().nullable(),
});

type PaystackInit = { authorizationUrl: string; reference: string };

async function paystackInitialize(input: {
  email: string;
  amount: number;
  reference: string;
  callbackUrl: string;
  metadata: Record<string, unknown>;
}): Promise<PaystackInit> {
  if (!paystackConfigured()) {
    throw new DomainPurchaseError("Payments aren't configured yet.", 503);
  }
  try {
    const data = await initializeTransaction({
      email: input.email,
      amount: toMinorUnits(input.amount),
      currency: "NGN",
      reference: input.reference,
      callback_url: input.callbackUrl,
      metadata: input.metadata,
    });
    return { authorizationUrl: data.authorization_url, reference: data.reference };
  } catch (err) {
    throw new DomainPurchaseError(
      err instanceof PaystackError ? err.message : "Couldn't start the payment.",
      502
    );
  }
}

function domainCallbackUrl(): string {
  return `${env.webUrl.replace(/\/$/, "")}/seller/domain`;
}

async function enqueueDomainJob(
  payload: { kind: "register"; registeredDomainId: string } | { kind: "renew"; registeredDomainId: string; years: number },
  jobId: string
) {
  try {
    await getDomainsQueue().add(payload.kind, payload, { jobId });
  } catch (err) {
    // The hourly sweep re-queues rows left in "registering".
    console.warn("[domains] enqueue failed", jobId, err instanceof Error ? err.message : err);
  }
}

export async function startDomainPurchase(input: {
  tenantId: string;
  payerEmail: string;
  domain: string;
  years: number;
  contact: RegistrantContact;
}): Promise<
  | { status: "registering"; domain: string }
  | { status: "payment"; domain: string; authorizationUrl: string; reference: string }
> {
  const registrar = getRegistrar();
  if (!registrar) {
    throw new DomainPurchaseError("Domain purchases aren't available right now.", 503);
  }
  if (!(await planAllows(input.tenantId, "customDomain"))) {
    throw new DomainPurchaseError(
      "Buying a domain is available on Lemi and Dami.",
      403,
      "PLAN_FEATURE"
    );
  }

  const pricing = await enabledPricing();
  const { sld, tld } = parseDomainQuery(input.domain, pricing.map((p) => p.tld));
  if (!tld) throw new DomainInputError("Choose a domain ending, like .com.ng.");
  const domain = `${sld}.${tld}`;
  const price = pricing.find((p) => p.tld === tld)!;
  const years = Math.min(Math.max(Math.round(input.years), 1), 5);

  const [lookup] = await registrar.lookup(sld, [tld]);
  if (lookup?.available !== true) {
    throw new DomainPurchaseError(`${domain} isn't available.`, 409, "TAKEN");
  }

  const contact = input.contact as unknown as Prisma.InputJsonValue;

  // Rows are never deleted once a payment exists. An abandoned checkout is taken over in
  // place: its open payments expire, and a late payment on one is refunded.
  const existing = await prisma.registeredDomain.findUnique({
    where: { domain },
    include: { payments: { where: { status: "paid" }, select: { id: true } } },
  });
  let rowId: string | null = null;
  if (existing) {
    if (existing.status === "registering" || existing.status === "active" || existing.status === "expired") {
      throw new DomainPurchaseError(`${domain} isn't available.`, 409, "TAKEN");
    }
    if (existing.payments.length > 0 && existing.tenantId !== input.tenantId) {
      throw new DomainPurchaseError(`${domain} isn't available.`, 409, "TAKEN");
    }
    const checkoutOpen =
      existing.status === "pending_payment" &&
      existing.tenantId !== input.tenantId &&
      existing.updatedAt.getTime() > Date.now() - 30 * 60 * 1000;
    if (checkoutOpen) {
      throw new DomainPurchaseError(
        `Someone is checking out ${domain} right now. Try again in a few minutes.`,
        409,
        "TAKEN"
      );
    }
    await prisma.domainPayment.updateMany({
      where: { registeredDomainId: existing.id, status: "pending" },
      data: { status: "expired" },
    });
    rowId = existing.id;
  }

  const wantsFree = tld === FREE_TLD && years === 1;
  if (wantsFree) {
    // Advisory lock per shop so two simultaneous requests can't both claim the free domain.
    const claimed = await prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`free-domain:${input.tenantId}`}))`;
      if (!(await freeDomainEligible(input.tenantId, tx))) return null;
      const data = { tenantId: input.tenantId, tld, free: true, status: "registering" as const, contact, lastError: null };
      return rowId
        ? tx.registeredDomain.update({ where: { id: rowId }, data })
        : tx.registeredDomain.create({ data: { ...data, domain } });
    });
    if (claimed) {
      await enqueueDomainJob({ kind: "register", registeredDomainId: claimed.id }, `register-${claimed.id}`);
      return { status: "registering", domain };
    }
  }

  const amount = price.register * years;
  const rowData = { tenantId: input.tenantId, tld, free: false, status: "pending_payment" as const, contact, lastError: null };
  const row = rowId
    ? await prisma.registeredDomain.update({ where: { id: rowId }, data: rowData })
    : await prisma.registeredDomain.create({ data: { ...rowData, domain } });
  const reference = newReference(PAYMENT_PREFIX);
  await prisma.domainPayment.create({
    data: {
      registeredDomainId: row.id,
      tenantId: input.tenantId,
      kind: "register",
      years,
      amount: new Prisma.Decimal(amount),
      paystackReference: reference,
    },
  });
  try {
    const init = await paystackInitialize({
      email: input.payerEmail,
      amount,
      reference,
      callbackUrl: domainCallbackUrl(),
      metadata: { purpose: "domain", kind: "register", domain, tenantId: input.tenantId, years },
    });
    return { status: "payment", domain, authorizationUrl: init.authorizationUrl, reference };
  } catch (err) {
    await prisma.domainPayment.updateMany({
      where: { paystackReference: reference, status: "pending" },
      data: { status: "failed" },
    });
    await prisma.registeredDomain.updateMany({
      where: { id: row.id, status: "pending_payment" },
      data: { status: "cancelled" },
    });
    throw err;
  }
}

export async function startDomainRenewal(input: {
  tenantId: string;
  payerEmail: string;
  registeredDomainId: string;
  years: number;
}) {
  const row = await prisma.registeredDomain.findFirst({
    where: { id: input.registeredDomainId, tenantId: input.tenantId },
  });
  if (!row) throw new DomainPurchaseError("Domain not found.", 404);
  if (!getRegistrar()) {
    throw new DomainPurchaseError("Domain renewals aren't available right now.", 503);
  }
  const renewable =
    (row.status === "active" || row.status === "expired") &&
    (!row.expiresAt || row.expiresAt.getTime() > Date.now() - 30 * DAY);
  if (!renewable) throw new DomainPurchaseError("This domain can't be renewed.", 409);

  const price = (await getDomainPricing()).find((p) => p.tld === row.tld);
  if (!price || price.renew <= 0) {
    throw new DomainPurchaseError("Renewal for this domain ending isn't available.", 409);
  }
  const years = Math.min(Math.max(Math.round(input.years), 1), 5);
  const amount = price.renew * years;
  const reference = newReference(PAYMENT_PREFIX);
  await prisma.domainPayment.create({
    data: {
      registeredDomainId: row.id,
      tenantId: input.tenantId,
      kind: "renew",
      years,
      amount: new Prisma.Decimal(amount),
      paystackReference: reference,
    },
  });
  const init = await paystackInitialize({
    email: input.payerEmail,
    amount,
    reference,
    callbackUrl: domainCallbackUrl(),
    metadata: { purpose: "domain", kind: "renew", domain: row.domain, tenantId: input.tenantId, years },
  });
  return { authorizationUrl: init.authorizationUrl, reference };
}

/** Refunds a paid domain payment and tells the admins. Never throws. */
async function refundDomainPayment(paymentId: string, reason: string): Promise<void> {
  const payment = await prisma.domainPayment.findUnique({
    where: { id: paymentId },
    include: { registeredDomain: { select: { domain: true } } },
  });
  if (!payment || payment.status !== "paid") return;
  let refunded = false;
  try {
    await refundTransaction(payment.paystackReference, { reason });
    await prisma.domainPayment.updateMany({
      where: { id: payment.id, status: "paid" },
      data: { status: "refunded" },
    });
    refunded = true;
  } catch (err) {
    console.error("[domains] refund failed", payment.paystackReference, err instanceof Error ? err.message : err);
  }
  await alertAdmins({
    title: refunded ? "Domain payment refunded" : "Domain refund needs attention",
    lines: [
      `${payment.registeredDomain.domain}: ${reason}.`,
      refunded
        ? `Paystack refund started for ${payment.paystackReference} (NGN ${Number(payment.amount)}).`
        : `The automatic refund for ${payment.paystackReference} failed. Refund it from the Paystack dashboard.`,
    ],
    path: "/admin/domains",
    idempotencyKey: `alert-domain-refund:${payment.id}`,
  });
}

/** Mark a domain payment paid (webhook or verify) and queue the registrar work. Idempotent. */
export async function fulfillDomainPayment(
  reference: string,
  paidKobo?: number,
  currency?: string
): Promise<boolean> {
  const payment = await prisma.domainPayment.findUnique({
    where: { paystackReference: reference },
    include: { registeredDomain: true },
  });
  if (!payment) return false;
  const wrongCurrency = currency != null && currency.toUpperCase() !== "NGN";
  if (wrongCurrency || (paidKobo != null && paidKobo !== toMinorUnits(Number(payment.amount)))) {
    console.warn("[domains] amount mismatch", reference, paidKobo, currency);
    await alertAdmins({
      title: "Domain payment amount mismatch",
      lines: [
        `${reference} expected NGN ${Number(payment.amount)}, Paystack reported ${currency ?? "NGN"} ${(paidKobo ?? 0) / 100}. Nothing was registered.`,
      ],
      idempotencyKey: `alert-domain-mismatch:${payment.id}`,
    });
    return false;
  }
  const claimed = await prisma.domainPayment.updateMany({
    where: { id: payment.id, status: { in: ["pending", "expired", "failed"] } },
    data: { status: "paid", paidAt: new Date() },
  });
  if (claimed.count === 0) return payment.status === "paid";

  const row = payment.registeredDomain;
  const payer = payment.tenantId ?? row.tenantId;
  if (payment.kind === "register") {
    // Late payment: the checkout expired and the domain moved on (another shop, or already registered).
    const stillOurs =
      row.tenantId === payer && (row.status === "pending_payment" || row.status === "cancelled");
    if (!stillOurs) {
      await refundDomainPayment(payment.id, "paid after the checkout expired and the domain was taken");
      return false;
    }
    const moved = await prisma.registeredDomain.updateMany({
      where: { id: row.id, tenantId: payer, status: { in: ["pending_payment", "cancelled"] } },
      data: { status: "registering", lastError: null },
    });
    if (!moved.count) {
      await refundDomainPayment(payment.id, "paid after the checkout expired and the domain was taken");
      return false;
    }
    await enqueueDomainJob({ kind: "register", registeredDomainId: row.id }, `register-${row.id}`);
  } else {
    await enqueueDomainJob(
      { kind: "renew", registeredDomainId: row.id, years: payment.years },
      `renew-${payment.id}`
    );
  }
  return true;
}

/** Check Paystack directly (for the redirect back) in case the webhook hasn't landed. */
export async function verifyDomainPayment(tenantId: string, reference: string) {
  const payment = await prisma.domainPayment.findUnique({
    where: { paystackReference: reference },
    include: { registeredDomain: true },
  });
  if (!payment || (payment.tenantId ?? payment.registeredDomain.tenantId) !== tenantId) {
    throw new DomainPurchaseError("Payment not found.", 404);
  }
  if ((payment.status === "pending" || payment.status === "expired") && paystackConfigured()) {
    try {
      const charge = await verifyTransaction(reference);
      if (charge?.status === "success") await fulfillDomainPayment(reference, charge.amount, charge.currency);
    } catch (err) {
      if (!(err instanceof PaystackError)) throw err;
    }
  }
  const fresh = await prisma.domainPayment.findUnique({
    where: { paystackReference: reference },
    include: { registeredDomain: true },
  });
  return {
    paymentStatus: fresh!.status,
    kind: fresh!.kind,
    domain: fresh!.registeredDomain.domain,
    domainStatus:
      fresh!.registeredDomain.tenantId === tenantId ? fresh!.registeredDomain.status : ("cancelled" as const),
  };
}

/* ---------------- Registrar work (worker) ---------------- */

function managedRecords(domain: string, token: string): ManagedDnsRecord[] {
  const [routing, ownership] = requiredRecords(domain, token);
  return [
    { type: routing!.type, name: routing!.name, value: routing!.value },
    { type: "CNAME", name: "www", value: env.customDomainCnameTarget },
    { type: "TXT", name: ownership!.name, value: ownership!.value },
  ];
}

/** Point a registered domain at the shop: set it as the shop domain and write the DNS for it. */
export async function connectRegisteredDomain(tenantId: string, registeredDomainId: string) {
  const row = await prisma.registeredDomain.findFirst({
    where: { id: registeredDomainId, tenantId },
  });
  if (!row || row.status !== "active") {
    throw new DomainPurchaseError("Only active domains can be connected.", 409);
  }
  const registrar = getRegistrar();
  if (!registrar) throw new DomainPurchaseError("Domain management isn't available right now.", 503);

  const { token } = await setTenantDomain(tenantId, row.domain);
  await registrar.setDnsRecords(row.domain, managedRecords(row.domain, token!));
  await verifyTenantDomain(tenantId).catch(() => undefined);
}

function addYears(from: Date, years: number): Date {
  const d = new Date(from);
  d.setUTCFullYear(d.getUTCFullYear() + years);
  return d;
}

function formatDate(d: Date): string {
  return d.toLocaleDateString("en-NG", { day: "numeric", month: "long", year: "numeric" });
}

function domainPageUrl(): string {
  return `${env.webUrl.replace(/\/$/, "")}/seller/domain`;
}

export async function processDomainRegistration(registeredDomainId: string): Promise<void> {
  const row = await prisma.registeredDomain.findUnique({
    where: { id: registeredDomainId },
    include: {
      tenant: { select: { id: true, name: true, customDomain: true, owner: { select: { email: true, name: true } } } },
      payments: { where: { kind: "register", status: "paid" }, take: 1 },
    },
  });
  if (!row || row.status !== "registering") return;
  const registrar = getRegistrar();
  if (!registrar) throw new Error("Registrar not configured");

  const years = row.payments[0]?.years ?? 1;
  const { ref } = await registrar.register({
    domain: row.domain,
    years,
    contact: row.contact as unknown as RegistrantContact,
  });
  const now = new Date();
  const expiresAt = addYears(now, years);
  await prisma.registeredDomain.update({
    where: { id: row.id },
    data: {
      status: "active",
      registrarRef: ref,
      registeredAt: now,
      expiresAt,
      lastError: null,
      remindersSent: [],
    },
  });

  // A shop without a domain gets its new one straight away; others connect it when they choose.
  if (!row.tenant.customDomain) {
    try {
      await connectRegisteredDomain(row.tenantId, row.id);
    } catch (err) {
      console.warn("[domains] auto-connect failed", row.domain, err instanceof Error ? err.message : err);
    }
  }

  await enqueueTransactionalMail({
    kind: "domain_active",
    to: row.tenant.owner.email,
    data: {
      name: row.tenant.owner.name,
      shopName: row.tenant.name,
      domain: row.domain,
      expiresOn: formatDate(expiresAt),
      domainUrl: domainPageUrl(),
    },
    idempotencyKey: `domain-active-${row.id}`,
  }).catch(() => undefined);
}

export async function processDomainRenewal(registeredDomainId: string, years: number): Promise<void> {
  const row = await prisma.registeredDomain.findUnique({ where: { id: registeredDomainId } });
  if (!row) return;
  const registrar = getRegistrar();
  if (!registrar) throw new Error("Registrar not configured");
  await registrar.renew(row.domain, years);
  const base = row.expiresAt && row.expiresAt > new Date() ? row.expiresAt : new Date();
  await prisma.registeredDomain.update({
    where: { id: row.id },
    data: { status: "active", expiresAt: addYears(base, years), remindersSent: [], lastError: null },
  });
}

/** Final failure after all retries: the seller gets their money back automatically. */
export async function markDomainJobFailed(registeredDomainId: string, kind: string, message: string) {
  await prisma.registeredDomain.updateMany({
    where: { id: registeredDomainId },
    data:
      kind === "register"
        ? { status: "failed", lastError: message.slice(0, 500) }
        : { lastError: `Renewal failed: ${message}`.slice(0, 500) },
  });
  const payment = await prisma.domainPayment.findFirst({
    where: { registeredDomainId, kind: kind === "register" ? "register" : "renew", status: "paid" },
    orderBy: { paidAt: "desc" },
  });
  if (payment) {
    await refundDomainPayment(
      payment.id,
      kind === "register" ? `registration failed (${message.slice(0, 200)})` : `renewal failed (${message.slice(0, 200)})`
    );
  } else if (kind === "register") {
    const row = await prisma.registeredDomain.findUnique({ where: { id: registeredDomainId }, select: { domain: true } });
    await alertAdmins({
      title: "Free domain registration failed",
      lines: [`${row?.domain ?? registeredDomainId}: ${message.slice(0, 300)}`],
      path: "/admin/domains",
      idempotencyKey: `alert-domain-failed:${registeredDomainId}`,
    });
  }
}

export async function noteDomainJobError(registeredDomainId: string, message: string) {
  await prisma.registeredDomain.updateMany({
    where: { id: registeredDomainId },
    data: { lastError: message.slice(0, 500) },
  });
}

/** Admin: put a failed registration back in the queue. */
export async function retryDomainRegistration(registeredDomainId: string) {
  const row = await prisma.registeredDomain.findUnique({ where: { id: registeredDomainId } });
  if (!row) throw new DomainPurchaseError("Domain not found.", 404);
  if (row.status !== "failed" && row.status !== "registering") {
    throw new DomainPurchaseError("Only failed registrations can be retried.", 409);
  }
  if (!row.free) {
    const paid = await prisma.domainPayment.count({
      where: { registeredDomainId: row.id, kind: "register", status: "paid" },
    });
    if (!paid) {
      throw new DomainPurchaseError("This registration was refunded, so there's no payment to retry with.", 409);
    }
  }
  await prisma.registeredDomain.update({
    where: { id: row.id },
    data: { status: "registering", lastError: null },
  });
  await enqueueDomainJob(
    { kind: "register", registeredDomainId: row.id },
    `register-${row.id}-${Date.now()}`
  );
}

/* ---------------- Hourly sweep: renewals, reminders, expiry ---------------- */

const REMINDER_DAYS = [30, 7, 1];

export async function sweepDomains(): Promise<{ renewed: number; reminded: number; expired: number }> {
  const now = new Date();
  let renewed = 0;
  let reminded = 0;

  const stuck = await prisma.registeredDomain.findMany({
    where: { status: "registering", updatedAt: { lt: new Date(now.getTime() - 2 * 60 * 60 * 1000) } },
    select: { id: true },
    take: 50,
  });
  for (const r of stuck) {
    await prisma.registeredDomain.update({ where: { id: r.id }, data: { updatedAt: now } });
    await enqueueDomainJob({ kind: "register", registeredDomainId: r.id }, `register-${r.id}-${now.getTime()}`);
  }

  const expired = await prisma.registeredDomain.updateMany({
    where: { status: "active", expiresAt: { lt: now } },
    data: { status: "expired" },
  });

  const due = await prisma.registeredDomain.findMany({
    where: { status: "active", expiresAt: { lte: new Date(now.getTime() + 30 * DAY) } },
    include: { tenant: { select: { name: true, owner: { select: { email: true, name: true } } } } },
    take: 200,
  });
  for (const row of due) {
    const expiresAt = row.expiresAt!;
    const periodKey = expiresAt.toISOString().slice(0, 10);

    if (row.free && (await planAllows(row.tenantId, "freeDomain"))) {
      const key = `${periodKey}:auto`;
      if (!row.remindersSent.includes(key) && expiresAt.getTime() - now.getTime() <= 14 * DAY) {
        await prisma.registeredDomain.update({
          where: { id: row.id },
          data: { remindersSent: { push: key } },
        });
        await enqueueDomainJob(
          { kind: "renew", registeredDomainId: row.id, years: 1 },
          `renew-free-${row.id}-${periodKey}`
        );
        renewed += 1;
      }
      continue;
    }

    const daysLeft = Math.max(Math.ceil((expiresAt.getTime() - now.getTime()) / DAY), 0);
    const threshold = [...REMINDER_DAYS].reverse().find((d) => daysLeft <= d);
    if (threshold == null) continue;
    const key = `${periodKey}:${threshold}`;
    if (row.remindersSent.includes(key)) continue;
    await prisma.registeredDomain.update({
      where: { id: row.id },
      data: { remindersSent: { push: key } },
    });
    await enqueueTransactionalMail({
      kind: "domain_renewal_due",
      to: row.tenant.owner.email,
      data: {
        name: row.tenant.owner.name,
        domain: row.domain,
        daysLeft,
        expiresOn: formatDate(expiresAt),
        domainUrl: domainPageUrl(),
      },
      idempotencyKey: `domain-renew-${row.id}-${key}`,
    }).catch(() => undefined);
    reminded += 1;
  }

  return { renewed, reminded, expired: expired.count };
}

/* ---------------- Serialisation ---------------- */

export function toOwnedDomain(
  row: RegisteredDomain,
  ctx: { connectedDomain: string | null; renewPrice: number | null; freeRenews: boolean }
) {
  const expiresSoon =
    !!row.expiresAt && row.expiresAt.getTime() - Date.now() <= 30 * DAY;
  return {
    id: row.id,
    domain: row.domain,
    tld: row.tld,
    status: row.status,
    free: row.free,
    registeredAt: row.registeredAt,
    expiresAt: row.expiresAt,
    connected: ctx.connectedDomain === row.domain,
    renewPrice: ctx.renewPrice,
    autoRenews: row.free && ctx.freeRenews,
    canRenew:
      ctx.renewPrice != null &&
      !(row.free && ctx.freeRenews) &&
      (row.status === "active" || row.status === "expired") &&
      (expiresSoon || row.status === "expired"),
    problem: row.status === "failed" ? "We couldn't complete this registration. Contact support and we'll sort it out." : null,
  };
}
