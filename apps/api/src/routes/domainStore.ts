import { Router, type NextFunction, type Response } from "express";
import rateLimit from "express-rate-limit";
import { z } from "zod";
import { prisma } from "../db/prisma";
import { requireAuth, requireRoles } from "../auth/middleware";
import { requireTenantFromMembership } from "../tenant/middleware";
import { planAllows } from "../lib/plans";
import { DomainConflictError, DomainInputError } from "../lib/customDomains";
import { getRegistrar } from "../services/registrar";
import {
  DomainPurchaseError,
  FREE_TLD,
  connectRegisteredDomain,
  freeDomainEligible,
  getDomainPricing,
  registrantSchema,
  retryDomainRegistration,
  searchDomains,
  startDomainPurchase,
  startDomainRenewal,
  tldPriceSchema,
  toOwnedDomain,
  verifyDomainPayment,
} from "../services/domains";
import { invalidatePlatformSettings } from "../lib/platformSettings";

export const sellerDomainStoreRouter = Router();
export const adminDomainsRouter = Router();

sellerDomainStoreRouter.use(requireAuth, requireTenantFromMembership());
adminDomainsRouter.use(requireAuth, requireRoles("super_admin"));

function handleDomainError(err: unknown, res: Response, next: NextFunction) {
  if (err instanceof DomainPurchaseError) {
    return res.status(err.status).json({ error: err.message, code: err.code });
  }
  if (err instanceof DomainInputError) return res.status(400).json({ error: err.message });
  if (err instanceof DomainConflictError) return res.status(409).json({ error: err.message });
  if (err instanceof z.ZodError) {
    return res.status(400).json({ error: err.issues[0]?.message ?? "Check the details and try again." });
  }
  return next(err);
}

async function canManage(userId: string, tenantId: string): Promise<boolean> {
  const m = await prisma.tenantAdmin.findUnique({
    where: { tenantId_userId: { tenantId, userId } },
    select: { role: true },
  });
  return m?.role === "owner" || m?.role === "manager";
}

async function ownedDomains(tenantId: string) {
  const [rows, tenant, pricing, freeRenews] = await Promise.all([
    prisma.registeredDomain.findMany({
      where: { tenantId, status: { not: "pending_payment" } },
      orderBy: { createdAt: "desc" },
    }),
    prisma.tenant.findUnique({ where: { id: tenantId }, select: { customDomain: true } }),
    getDomainPricing(),
    planAllows(tenantId, "freeDomain"),
  ]);
  const renewOf = new Map(pricing.filter((p) => p.renew > 0).map((p) => [p.tld, p.renew]));
  return rows.map((r) =>
    toOwnedDomain(r, {
      connectedDomain: tenant?.customDomain ?? null,
      renewPrice: renewOf.get(r.tld) ?? null,
      freeRenews,
    })
  );
}

sellerDomainStoreRouter.get("/store", async (req, res, next) => {
  try {
    const tenantId = req.tenant!.tenantId;
    const [tenant, user, pricing, planAllowed, freeEligible, owned] = await Promise.all([
      prisma.tenant.findUnique({
        where: { id: tenantId },
        select: { name: true, phone: true, email: true, address: true, location: true, countryCode: true, stateCode: true },
      }),
      prisma.user.findUnique({ where: { id: req.user!.id }, select: { name: true, email: true, phone: true } }),
      getDomainPricing(),
      planAllows(tenantId, "customDomain"),
      freeDomainEligible(tenantId),
      ownedDomains(tenantId),
    ]);
    const [firstName = "", ...rest] = (user?.name ?? "").trim().split(/\s+/);
    return res.json({
      available: !!getRegistrar(),
      planAllowed,
      freeEligible,
      freeTld: FREE_TLD,
      tlds: pricing
        .filter((p) => p.enabled && p.register > 0)
        .map((p) => ({ tld: p.tld, price: p.register, renewPrice: p.renew })),
      owned,
      contactDefaults: {
        firstName,
        lastName: rest.join(" "),
        company: tenant?.name ?? "",
        email: user?.email ?? tenant?.email ?? "",
        phone: tenant?.phone ?? user?.phone ?? "",
        address: tenant?.address ?? "",
        city: tenant?.location ?? "",
        stateCode: tenant?.stateCode ?? "",
        country: tenant?.countryCode ?? "NG",
      },
    });
  } catch (err) {
    return next(err);
  }
});

const searchLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many searches. Wait a minute and try again." },
});

sellerDomainStoreRouter.get("/search", searchLimiter, async (req, res, next) => {
  try {
    const q = z.string().max(300).parse(req.query.q ?? "");
    return res.json(await searchDomains(req.tenant!.tenantId, q));
  } catch (err) {
    return handleDomainError(err, res, next);
  }
});

sellerDomainStoreRouter.post("/buy", async (req, res, next) => {
  try {
    const tenantId = req.tenant!.tenantId;
    if (!(await canManage(req.user!.id, tenantId))) {
      return res.status(403).json({ error: "Only owners and managers can buy a domain." });
    }
    const body = z
      .object({
        domain: z.string().min(3).max(300),
        years: z.coerce.number().int().min(1).max(5).default(1),
        contact: registrantSchema,
      })
      .parse(req.body);
    return res.json(
      await startDomainPurchase({
        tenantId,
        payerEmail: req.user!.email,
        domain: body.domain,
        years: body.years,
        contact: body.contact,
      })
    );
  } catch (err) {
    return handleDomainError(err, res, next);
  }
});

sellerDomainStoreRouter.get("/purchases/:reference/verify", async (req, res, next) => {
  try {
    return res.json(await verifyDomainPayment(req.tenant!.tenantId, req.params.reference));
  } catch (err) {
    return handleDomainError(err, res, next);
  }
});

sellerDomainStoreRouter.post("/owned/:id/renew", async (req, res, next) => {
  try {
    const tenantId = req.tenant!.tenantId;
    if (!(await canManage(req.user!.id, tenantId))) {
      return res.status(403).json({ error: "Only owners and managers can renew a domain." });
    }
    const body = z.object({ years: z.coerce.number().int().min(1).max(5).default(1) }).parse(req.body ?? {});
    return res.json(
      await startDomainRenewal({
        tenantId,
        payerEmail: req.user!.email,
        registeredDomainId: req.params.id,
        years: body.years,
      })
    );
  } catch (err) {
    return handleDomainError(err, res, next);
  }
});

sellerDomainStoreRouter.post("/owned/:id/connect", async (req, res, next) => {
  try {
    const tenantId = req.tenant!.tenantId;
    if (!(await canManage(req.user!.id, tenantId))) {
      return res.status(403).json({ error: "Only owners and managers can manage the domain." });
    }
    if (!(await planAllows(tenantId, "customDomain"))) {
      return res.status(403).json({ error: "Custom domains are available on Lemi and Dami.", code: "PLAN_FEATURE" });
    }
    await connectRegisteredDomain(tenantId, req.params.id);
    return res.json({ ok: true, owned: await ownedDomains(tenantId) });
  } catch (err) {
    return handleDomainError(err, res, next);
  }
});

/* ---------------- Admin ---------------- */

adminDomainsRouter.get("/domain-pricing", async (_req, res, next) => {
  try {
    return res.json({ pricing: await getDomainPricing(), registrar: getRegistrar()?.id ?? null });
  } catch (err) {
    return next(err);
  }
});

adminDomainsRouter.put("/domain-pricing", async (req, res, next) => {
  try {
    const body = z.object({ pricing: z.array(tldPriceSchema).min(1).max(40) }).parse(req.body);
    const seen = new Set<string>();
    for (const p of body.pricing) {
      if (seen.has(p.tld)) return res.status(400).json({ error: `.${p.tld} is listed twice.` });
      seen.add(p.tld);
    }
    const value = JSON.stringify(body.pricing);
    await prisma.platformSetting.upsert({
      where: { key: "domain_pricing" },
      update: { value },
      create: { key: "domain_pricing", value },
    });
    invalidatePlatformSettings();
    return res.json({ pricing: body.pricing });
  } catch (err) {
    return handleDomainError(err, res, next);
  }
});

adminDomainsRouter.get("/domains", async (_req, res, next) => {
  try {
    const rows = await prisma.registeredDomain.findMany({
      where: { status: { not: "pending_payment" } },
      orderBy: { createdAt: "desc" },
      take: 200,
      include: {
        tenant: { select: { id: true, name: true, slug: true, customDomain: true } },
        payments: { where: { status: "paid" }, select: { amount: true, kind: true, years: true, paidAt: true } },
      },
    });
    return res.json({
      domains: rows.map((r) => ({
        id: r.id,
        domain: r.domain,
        status: r.status,
        free: r.free,
        registrarRef: r.registrarRef,
        registeredAt: r.registeredAt,
        expiresAt: r.expiresAt,
        lastError: r.lastError,
        createdAt: r.createdAt,
        connected: r.tenant.customDomain === r.domain,
        tenant: { id: r.tenant.id, name: r.tenant.name, slug: r.tenant.slug },
        paid: r.payments.reduce((sum, p) => sum + Number(p.amount), 0),
      })),
    });
  } catch (err) {
    return next(err);
  }
});

adminDomainsRouter.post("/domains/:id/retry", async (req, res, next) => {
  try {
    await retryDomainRegistration(req.params.id);
    return res.json({ ok: true });
  } catch (err) {
    return handleDomainError(err, res, next);
  }
});
