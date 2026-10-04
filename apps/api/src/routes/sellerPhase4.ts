import crypto from "crypto";
import { Router } from "express";
import rateLimit from "express-rate-limit";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "../db/prisma";
import { env } from "../config/env";
import { enqueueTransactionalMail } from "../queue/transactionalMail";
import { requireAuth } from "../auth/middleware";
import { requireTenantFromMembership } from "../tenant/middleware";
import { tenantWhere } from "../tenant/tenantContext";
import { decimalToNumber, toTenantPublic, toUserPublic } from "../lib/serialize";
import {
  expirePlans,
  planAllows,
  planEnding,
  switchPlan,
  teamSeatLimit,
} from "../lib/plans";
import {
  DomainConflictError,
  DomainInputError,
  hostingStatus,
  normalizeDomain,
  platformShopUrl,
  requiredRecords,
  setTenantDomain,
  verifyTenantDomain,
  type DnsCheck,
} from "../lib/customDomains";

export const sellerTeamRouter = Router();
export const sellerDomainRouter = Router();
export const sellerNotificationsRouter = Router();
export const sellerPlanRouter = Router();

sellerTeamRouter.use(requireAuth, requireTenantFromMembership());
sellerDomainRouter.use(requireAuth, requireTenantFromMembership());
sellerNotificationsRouter.use(requireAuth, requireTenantFromMembership());
sellerPlanRouter.use(requireAuth, requireTenantFromMembership());

async function membershipRole(userId: string, tenantId: string) {
  return prisma.tenantAdmin.findUnique({
    where: { tenantId_userId: { tenantId, userId } },
  });
}

function canManageTeam(role: string) {
  return role === "owner" || role === "manager";
}

sellerTeamRouter.get("/", async (req, res, next) => {
  try {
    const members = await prisma.tenantAdmin.findMany({
      where: { tenantId: req.tenant!.tenantId },
      include: { user: true },
      orderBy: { role: "asc" },
    });
    return res.json({
      members: members.map((m) => ({
        id: m.id,
        role: m.role,
        permissions: m.permissions,
        user: toUserPublic(m.user),
      })),
    });
  } catch (err) {
    return next(err);
  }
});

const inviteSchema = z.object({
  email: z.string().email(),
  role: z.enum(["manager", "staff"]).default("staff"),
});

sellerTeamRouter.post("/invite", async (req, res, next) => {
  try {
    const me = await membershipRole(req.user!.id, req.tenant!.tenantId);
    if (!me || !canManageTeam(me.role)) {
      return res.status(403).json({ error: "Only owners and managers can invite" });
    }
    const body = inviteSchema.parse(req.body);
    const email = body.email.toLowerCase();

    const seats = await teamSeatLimit(req.tenant!.tenantId);
    if (seats !== null) {
      const used = await prisma.tenantAdmin.count({
        where: { tenantId: req.tenant!.tenantId, role: { not: "owner" } },
      });
      if (used >= seats) {
        return res.status(403).json({
          error:
            seats === 0
              ? "Your plan doesn't include team members. Upgrade to invite your team."
              : `Your plan allows ${seats} team member${seats === 1 ? "" : "s"}. Upgrade to add more.`,
          code: "PLAN_FEATURE",
        });
      }
    }

    let user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      user = await prisma.user.create({
        data: {
          email,
          role: "tenant_admin",
          passwordHash: null,
        },
      });
    }

    const existing = await prisma.tenantAdmin.findUnique({
      where: {
        tenantId_userId: {
          tenantId: req.tenant!.tenantId,
          userId: user.id,
        },
      },
    });
    if (existing) {
      return res.status(409).json({ error: "User is already on the team" });
    }

    const member = await prisma.tenantAdmin.create({
      data: {
        tenantId: req.tenant!.tenantId,
        userId: user.id,
        role: body.role,
        permissions: {},
      },
      include: { user: true },
    });

    if (user.role === "buyer") {
      await prisma.user.update({
        where: { id: user.id },
        data: { role: "tenant_admin" },
      });
    }

    try {
      const [tenant, inviter] = await Promise.all([
        prisma.tenant.findUnique({
          where: { id: req.tenant!.tenantId },
          select: { name: true },
        }),
        prisma.user.findUnique({
          where: { id: req.user!.id },
          select: { name: true, email: true },
        }),
      ]);
      let setPasswordUrl: string | undefined;
      if (!user.passwordHash) {
        const raw = crypto.randomBytes(32).toString("hex");
        await prisma.user.update({
          where: { id: user.id },
          data: {
            passwordResetToken: crypto.createHash("sha256").update(raw).digest("hex"),
            passwordResetExpires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          },
        });
        setPasswordUrl = `${env.webUrl}/reset-password?token=${raw}`;
      }
      await enqueueTransactionalMail({
        kind: "team_invite",
        to: user.email,
        data: {
          name: user.name,
          shopName: tenant?.name,
          inviterName: inviter?.name || inviter?.email,
          roleLabel: body.role === "manager" ? "manager" : "staff member",
          setPasswordUrl,
          loginUrl: `${env.webUrl}/login?next=/seller`,
        },
        idempotencyKey: `team-invite:${member.id}`,
      });
    } catch (mailErr) {
      console.warn("[team] invite mail failed:", mailErr);
    }

    return res.status(201).json({
      member: {
        id: member.id,
        role: member.role,
        permissions: member.permissions,
        user: toUserPublic(member.user),
      },
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res
        .status(400)
        .json({ error: "Validation failed", details: err.flatten() });
    }
    return next(err);
  }
});

sellerTeamRouter.patch("/:id", async (req, res, next) => {
  try {
    const me = await membershipRole(req.user!.id, req.tenant!.tenantId);
    if (!me || me.role !== "owner") {
      return res.status(403).json({ error: "Only owners can change roles" });
    }
    const body = z
      .object({ role: z.enum(["manager", "staff"]) })
      .parse(req.body);
    const target = await prisma.tenantAdmin.findFirst({
      where: tenantWhere(req.tenant!, { id: req.params.id }),
    });
    if (!target) return res.status(404).json({ error: "Member not found" });
    if (target.role === "owner") {
      return res.status(400).json({ error: "Cannot change owner role" });
    }
    const member = await prisma.tenantAdmin.update({
      where: { id: target.id },
      data: { role: body.role },
      include: { user: true },
    });
    return res.json({
      member: {
        id: member.id,
        role: member.role,
        permissions: member.permissions,
        user: toUserPublic(member.user),
      },
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res
        .status(400)
        .json({ error: "Validation failed", details: err.flatten() });
    }
    return next(err);
  }
});

sellerTeamRouter.delete("/:id", async (req, res, next) => {
  try {
    const me = await membershipRole(req.user!.id, req.tenant!.tenantId);
    if (!me || !canManageTeam(me.role)) {
      return res.status(403).json({ error: "Not allowed" });
    }
    const target = await prisma.tenantAdmin.findFirst({
      where: tenantWhere(req.tenant!, { id: req.params.id }),
    });
    if (!target) return res.status(404).json({ error: "Member not found" });
    if (target.role === "owner") {
      return res.status(400).json({ error: "Cannot remove the owner" });
    }
    await prisma.tenantAdmin.delete({ where: { id: target.id } });
    return res.json({ ok: true });
  } catch (err) {
    return next(err);
  }
});

async function domainPayload(tenantId: string, check?: DnsCheck | null) {
  const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
  if (!tenant) return null;
  const planAllowed = await planAllows(tenantId, "customDomain");
  const domain = tenant.customDomain;

  let status: "none" | "plan" | "pending" | "securing" | "live" = "none";
  if (domain) {
    if (!planAllowed) status = "plan";
    else if (!tenant.customDomainVerifiedAt) status = "pending";
    else status = (await hostingStatus(domain)) === "verified" ? "live" : "securing";
  }

  return {
    customDomain: domain,
    status,
    planAllowed,
    records:
      domain && tenant.customDomainToken
        ? requiredRecords(domain, tenant.customDomainToken)
        : [],
    verifiedAt: tenant.customDomainVerifiedAt,
    checkedAt: tenant.customDomainCheckedAt,
    note: tenant.customDomainError,
    platformUrl: platformShopUrl(tenant.slug),
    aliasTarget: env.customDomainCnameTarget,
    liveUrl: domain && status === "live" ? `https://${domain}` : null,
    check: check
      ? { ownership: check.ownership, routing: check.routing, found: check.found }
      : null,
  };
}

sellerDomainRouter.get("/", async (req, res, next) => {
  try {
    const payload = await domainPayload(req.tenant!.tenantId);
    if (!payload) return res.status(404).json({ error: "Shop not found" });
    return res.json(payload);
  } catch (err) {
    return next(err);
  }
});

const domainVerifyLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 6,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many checks. Wait a minute and try again." },
});

sellerDomainRouter.post("/verify", domainVerifyLimiter, async (req, res, next) => {
  try {
    const me = await membershipRole(req.user!.id, req.tenant!.tenantId);
    if (!me || !canManageTeam(me.role)) {
      return res.status(403).json({ error: "Only owners and managers can manage the domain" });
    }
    if (!(await planAllows(req.tenant!.tenantId, "customDomain"))) {
      return res.status(403).json({
        error: "Custom domains are available on Lemi and Dami.",
        code: "PLAN_FEATURE",
      });
    }
    const result = await verifyTenantDomain(req.tenant!.tenantId);
    return res.json(await domainPayload(req.tenant!.tenantId, result.check));
  } catch (err) {
    return next(err);
  }
});

sellerDomainRouter.put("/", async (req, res, next) => {
  try {
    const me = await membershipRole(req.user!.id, req.tenant!.tenantId);
    if (!me || !canManageTeam(me.role)) {
      return res.status(403).json({ error: "Only owners and managers can set domain" });
    }
    const body = z
      .object({ customDomain: z.string().max(300).nullable() })
      .parse(req.body);

    const tenantId = req.tenant!.tenantId;
    const domain = body.customDomain?.trim() ? normalizeDomain(body.customDomain) : null;

    if (domain && !(await planAllows(tenantId, "customDomain"))) {
      return res.status(403).json({
        error: "Custom domains are available on Lemi and Dami.",
        code: "PLAN_FEATURE",
      });
    }

    await setTenantDomain(tenantId, domain);
    return res.json(await domainPayload(tenantId));
  } catch (err) {
    if (err instanceof DomainInputError) {
      return res.status(400).json({ error: err.message });
    }
    if (err instanceof DomainConflictError) {
      return res.status(409).json({ error: err.message });
    }
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      return res.status(409).json({ error: "That domain is already linked to another shop." });
    }
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: "Enter a domain like shop.yourbrand.com." });
    }
    return next(err);
  }
});

sellerNotificationsRouter.get("/", async (req, res, next) => {
  try {
    const tenant = await prisma.tenant.findUnique({
      where: { id: req.tenant!.tenantId },
      include: { owner: true },
    });
    if (!tenant) return res.status(404).json({ error: "Shop not found" });
    const settings =
      (tenant.notificationSettings as {
        whatsappOrdersEnabled?: boolean;
      } | null) ?? {};
    return res.json({
      whatsappOrdersEnabled: !!settings.whatsappOrdersEnabled,
      whatsappNumber: tenant.owner.whatsappNumber,
      phone: tenant.owner.phone,
    });
  } catch (err) {
    return next(err);
  }
});

sellerNotificationsRouter.put("/", async (req, res, next) => {
  try {
    const me = await membershipRole(req.user!.id, req.tenant!.tenantId);
    if (!me || !canManageTeam(me.role)) {
      return res.status(403).json({ error: "Not allowed" });
    }
    const body = z
      .object({
        whatsappOrdersEnabled: z.boolean().optional(),
        whatsappNumber: z.string().min(5).max(32).nullable().optional(),
      })
      .parse(req.body);

    const tenant = await prisma.tenant.findUnique({
      where: { id: req.tenant!.tenantId },
    });
    if (!tenant) return res.status(404).json({ error: "Shop not found" });

    const prev =
      (tenant.notificationSettings as Record<string, unknown> | null) ?? {};
    const updated = await prisma.tenant.update({
      where: { id: tenant.id },
      data: {
        notificationSettings: {
          ...prev,
          ...(body.whatsappOrdersEnabled != null
            ? { whatsappOrdersEnabled: body.whatsappOrdersEnabled }
            : {}),
        },
      },
      include: { owner: true },
    });

    if (body.whatsappNumber !== undefined) {
      await prisma.user.update({
        where: { id: updated.ownerUserId },
        data: { whatsappNumber: body.whatsappNumber },
      });
    }

    const owner = await prisma.user.findUnique({
      where: { id: updated.ownerUserId },
    });
    const settings =
      (updated.notificationSettings as {
        whatsappOrdersEnabled?: boolean;
      } | null) ?? {};

    return res.json({
      whatsappOrdersEnabled: !!settings.whatsappOrdersEnabled,
      whatsappNumber: owner?.whatsappNumber ?? null,
      phone: owner?.phone ?? null,
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res
        .status(400)
        .json({ error: "Validation failed", details: err.flatten() });
    }
    return next(err);
  }
});

sellerPlanRouter.get("/", async (req, res, next) => {
  try {
    await expirePlans(req.tenant!.tenantId);
    const tenant = await prisma.tenant.findUnique({
      where: { id: req.tenant!.tenantId },
      include: { plan: true, _count: { select: { products: true } } },
    });
    if (!tenant) return res.status(404).json({ error: "Shop not found" });

    const plans = await prisma.plan.findMany({
      where: { active: true },
      orderBy: { price: "asc" },
    });

    const ending = planEnding(tenant);
    const endsInFuture = ending != null && ending.endsAt.getTime() > Date.now();
    const trialActive = endsInFuture && ending?.kind === "trial";
    const daysLeft = endsInFuture
      ? Math.ceil((ending!.endsAt.getTime() - Date.now()) / (24 * 60 * 60 * 1000))
      : 0;
    const trialDaysLeft = trialActive ? daysLeft : 0;
    const [liveCount, pausedCount] = await Promise.all([
      prisma.product.count({ where: { tenantId: tenant.id, status: "active" } }),
      prisma.product.count({ where: { tenantId: tenant.id, status: "paused" } }),
    ]);

    return res.json({
      tenant: toTenantPublic(tenant),
      plan: tenant.plan
        ? {
            id: tenant.plan.id,
            name: tenant.plan.name,
            slug: tenant.plan.slug,
            price: decimalToNumber(tenant.plan.price),
            currency: tenant.plan.currency,
            productLimit: tenant.plan.productLimit,
            featureFlags: tenant.plan.featureFlags,
            trialDays: tenant.plan.trialDays,
          }
        : null,
      productCount: tenant._count.products,
      liveCount,
      pausedCount,
      trialActive,
      trialDaysLeft,
      /** End of the paid period, when on a paid plan with an end date. */
      planExpiresAt: tenant.planExpiresAt?.toISOString() ?? null,
      /** Days until the trial or paid period ends; 0 when it doesn't end. */
      daysLeft,
      lapsed: tenant.status === "lapsed",
      plans: plans.map((p) => ({
        id: p.id,
        name: p.name,
        slug: p.slug,
        price: decimalToNumber(p.price),
        currency: p.currency,
        productLimit: p.productLimit,
        featureFlags: p.featureFlags,
        trialDays: p.trialDays,
      })),
    });
  } catch (err) {
    return next(err);
  }
});

sellerPlanRouter.post("/upgrade", async (req, res, next) => {
  try {
    const me = await membershipRole(req.user!.id, req.tenant!.tenantId);
    if (!me || me.role !== "owner") {
      return res.status(403).json({ error: "Only the owner can change plans" });
    }
    const body = z.object({ planId: z.string().min(1) }).parse(req.body);
    const plan = await prisma.plan.findFirst({
      where: { id: body.planId, active: true },
    });
    if (!plan) return res.status(404).json({ error: "Plan not found" });

    await expirePlans(req.tenant!.tenantId);
    const current = await prisma.tenant.findUniqueOrThrow({
      where: { id: req.tenant!.tenantId },
    });
    const trialActive =
      current.planExpiresAt == null &&
      current.trialEndsAt != null &&
      current.trialEndsAt.getTime() > Date.now();
    const isFree = decimalToNumber(plan.price) <= 0;

    if (!isFree && !trialActive) {
      return res.status(402).json({
        error: "Paid plans can be started once online billing is live.",
        code: "BILLING_NOT_LIVE",
      });
    }

    const { paused, restored } = await switchPlan(current.id, plan.id);
    const tenant = await prisma.tenant.findUniqueOrThrow({
      where: { id: current.id },
      include: { plan: true },
    });

    return res.json({
      paused,
      restored,
      tenant: toTenantPublic(tenant),
      plan: tenant.plan
        ? {
            id: tenant.plan.id,
            name: tenant.plan.name,
            slug: tenant.plan.slug,
            price: decimalToNumber(tenant.plan.price),
            currency: tenant.plan.currency,
            productLimit: tenant.plan.productLimit,
          }
        : null,
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res
        .status(400)
        .json({ error: "Validation failed", details: err.flatten() });
    }
    return next(err);
  }
});
