import crypto from "crypto";
import { Router } from "express";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "../db/prisma";
import { env } from "../config/env";
import { enqueueTransactionalMail } from "../queue/transactionalMail";
import { requireAuth } from "../auth/middleware";
import { requireTenantFromMembership, requireTenantRoles } from "../tenant/middleware";
import { redisRateLimit } from "../lib/rateLimit";
import { setActiveShopCookie } from "../tenant/activeShop";
import { tenantWhere } from "../tenant/tenantContext";
import { decimalToNumber, toTenantPublic, toUserPublic } from "../lib/serialize";
import {
  expirePlans,
  isBillingMonths,
  planAllows,
  planEnding,
  switchPlan,
  teamSeatLimit,
} from "../lib/plans";
import { applyPlanCharge, PlanBillingError, startPlanCheckout } from "../services/planBilling";
import { PaystackError, verifyTransaction } from "../services/paystack";
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

const ownerOnly = requireTenantRoles("owner");

const inviteLimiter = redisRateLimit({
  name: "team-invite",
  windowMs: 60 * 60_000,
  max: 30,
  by: "ip",
});

const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const hashInviteToken = (raw: string) => crypto.createHash("sha256").update(raw).digest("hex");

function memberJson(m: { id: string; role: string; permissions: unknown; user: Parameters<typeof toUserPublic>[0] }) {
  return { id: m.id, role: m.role, permissions: m.permissions, user: toUserPublic(m.user) };
}

sellerTeamRouter.get("/", async (req, res, next) => {
  try {
    const [members, invites] = await Promise.all([
      prisma.tenantAdmin.findMany({
        where: { tenantId: req.tenant!.tenantId },
        include: { user: true },
        orderBy: { role: "asc" },
      }),
      prisma.teamInvite.findMany({
        where: { tenantId: req.tenant!.tenantId, acceptedAt: null, expiresAt: { gt: new Date() } },
        orderBy: { createdAt: "desc" },
      }),
    ]);
    return res.json({
      members: members.map(memberJson),
      invites: invites.map((i) => ({
        id: i.id,
        email: i.email,
        role: i.role,
        expiresAt: i.expiresAt.toISOString(),
      })),
    });
  } catch (err) {
    return next(err);
  }
});

const inviteSchema = z.object({
  email: z.string().trim().email().max(254),
  role: z.enum(["manager", "staff"]).default("staff"),
});

/** Invites only send an email. Nothing changes for the invitee until they accept. */
sellerTeamRouter.post("/invite", ownerOnly, inviteLimiter, async (req, res, next) => {
  try {
    const body = inviteSchema.parse(req.body);
    const email = body.email.toLowerCase();
    const tenantId = req.tenant!.tenantId;

    const seats = await teamSeatLimit(tenantId);
    if (seats !== null) {
      const [used, pending] = await Promise.all([
        prisma.tenantAdmin.count({ where: { tenantId, role: { not: "owner" } } }),
        prisma.teamInvite.count({
          where: { tenantId, acceptedAt: null, expiresAt: { gt: new Date() }, email: { not: email } },
        }),
      ]);
      if (used + pending >= seats) {
        return res.status(403).json({
          error:
            seats === 0
              ? "Your plan doesn't include team members. Upgrade to invite your team."
              : `Your plan allows ${seats} team member${seats === 1 ? "" : "s"}. Upgrade to add more.`,
          code: "PLAN_FEATURE",
        });
      }
    }

    const alreadyMember = await prisma.tenantAdmin.findFirst({
      where: { tenantId, user: { email } },
    });
    if (alreadyMember) {
      return res.status(409).json({ error: "That person is already on the team" });
    }

    const raw = crypto.randomBytes(32).toString("base64url");
    const invite = await prisma.$transaction(async (tx) => {
      await tx.teamInvite.deleteMany({ where: { tenantId, email, acceptedAt: null } });
      return tx.teamInvite.create({
        data: {
          tenantId,
          email,
          role: body.role,
          tokenHash: hashInviteToken(raw),
          invitedById: req.user!.id,
          expiresAt: new Date(Date.now() + INVITE_TTL_MS),
        },
      });
    });

    try {
      const [tenant, inviter] = await Promise.all([
        prisma.tenant.findUnique({ where: { id: tenantId }, select: { name: true } }),
        prisma.user.findUnique({ where: { id: req.user!.id }, select: { name: true, email: true } }),
      ]);
      await enqueueTransactionalMail({
        kind: "team_invite",
        to: email,
        data: {
          shopName: tenant?.name,
          inviterName: inviter?.name || inviter?.email,
          roleLabel: body.role === "manager" ? "manager" : "staff member",
          acceptUrl: `${env.webUrl}/invite/accept?token=${raw}`,
        },
        idempotencyKey: `team-invite:${invite.id}`,
      });
    } catch (mailErr) {
      console.warn("[team] invite mail failed:", mailErr);
    }

    return res.status(201).json({
      invite: {
        id: invite.id,
        email: invite.email,
        role: invite.role,
        expiresAt: invite.expiresAt.toISOString(),
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

sellerTeamRouter.delete("/invites/:id", ownerOnly, async (req, res, next) => {
  try {
    const res1 = await prisma.teamInvite.deleteMany({
      where: { id: req.params.id, tenantId: req.tenant!.tenantId, acceptedAt: null },
    });
    if (res1.count === 0) return res.status(404).json({ error: "Invite not found" });
    return res.json({ ok: true });
  } catch (err) {
    return next(err);
  }
});

sellerTeamRouter.patch("/:id", ownerOnly, async (req, res, next) => {
  try {
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
    return res.json({ member: memberJson(member) });
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
    const target = await prisma.tenantAdmin.findFirst({
      where: tenantWhere(req.tenant!, { id: req.params.id }),
    });
    if (!target) return res.status(404).json({ error: "Member not found" });
    if (target.role === "owner") {
      return res.status(400).json({ error: "Cannot remove the owner" });
    }
    const leavingSelf = target.userId === req.user!.id;
    if (!leavingSelf && req.tenant!.membershipRole !== "owner") {
      return res.status(403).json({ error: "Only the owner can remove team members" });
    }
    await prisma.tenantAdmin.delete({ where: { id: target.id } });
    return res.json({ ok: true });
  } catch (err) {
    return next(err);
  }
});

/** Public invite preview + authenticated acceptance (mounted at /api/team-invites). */
const planCheckoutLimiter = redisRateLimit({
  name: "plan-checkout",
  windowMs: 10 * 60 * 1000,
  max: 10,
  by: "tenant",
  message: "Too many payment attempts. Please wait a few minutes.",
});

/** Pay for a plan term online. Price is computed on the server from the plan row. */
sellerPlanRouter.post("/checkout", ownerOnly, planCheckoutLimiter, async (req, res, next) => {
  try {
    const body = z
      .object({ planId: z.string().min(1).max(40), months: z.coerce.number().int() })
      .parse(req.body);
    if (!isBillingMonths(body.months)) {
      return res.status(400).json({ error: "Choose 1, 6 or 12 months" });
    }
    const result = await startPlanCheckout({
      tenantId: req.tenant!.tenantId,
      planId: body.planId,
      months: body.months,
      userId: req.user!.id,
      email: req.user!.email,
    });
    return res.json(result);
  } catch (err) {
    if (err instanceof z.ZodError) return res.status(400).json({ error: "Validation failed" });
    if (err instanceof PlanBillingError) return res.status(err.status).json({ error: err.message });
    return next(err);
  }
});

sellerPlanRouter.get("/verify/:reference", async (req, res, next) => {
  try {
    const where = { reference: req.params.reference, tenantId: req.tenant!.tenantId };
    let payment = await prisma.planPayment.findFirst({ where, include: { plan: true } });
    if (!payment) return res.status(404).json({ error: "Payment not found" });
    if (payment.status !== "paid") {
      try {
        const charge = await verifyTransaction(payment.reference);
        if (charge?.status === "success") {
          await applyPlanCharge(charge);
          payment = await prisma.planPayment.findFirstOrThrow({ where, include: { plan: true } });
        }
      } catch (err) {
        if (!(err instanceof PaystackError)) throw err;
      }
    }
    const tenant = await prisma.tenant.findUniqueOrThrow({
      where: { id: req.tenant!.tenantId },
      select: { planExpiresAt: true },
    });
    return res.json({
      status: payment.status,
      planName: payment.plan.name,
      months: payment.months,
      amount: decimalToNumber(payment.amount),
      currency: payment.currency,
      planExpiresAt: tenant.planExpiresAt?.toISOString() ?? null,
    });
  } catch (err) {
    return next(err);
  }
});

export const teamInvitesRouter = Router();

async function findLiveInvite(raw: unknown) {
  if (typeof raw !== "string" || raw.length < 20 || raw.length > 100) return null;
  const invite = await prisma.teamInvite.findUnique({
    where: { tokenHash: hashInviteToken(raw) },
    include: { tenant: { select: { name: true, slug: true } } },
  });
  if (!invite || invite.acceptedAt || invite.expiresAt <= new Date()) return null;
  return invite;
}

function maskEmail(email: string): string {
  const [local = "", domain = ""] = email.split("@");
  const shown = local.slice(0, Math.min(2, local.length));
  return `${shown}${"*".repeat(Math.max(1, local.length - shown.length))}@${domain}`;
}

teamInvitesRouter.post("/preview", inviteLimiter, async (req, res, next) => {
  try {
    const invite = await findLiveInvite(req.body?.token);
    if (!invite) return res.status(404).json({ error: "This invite is invalid or has expired." });
    return res.json({
      shopName: invite.tenant.name,
      role: invite.role,
      email: maskEmail(invite.email),
    });
  } catch (err) {
    return next(err);
  }
});

teamInvitesRouter.post("/accept", requireAuth, inviteLimiter, async (req, res, next) => {
  try {
    const invite = await findLiveInvite(req.body?.token);
    if (!invite) return res.status(404).json({ error: "This invite is invalid or has expired." });
    if (invite.email !== req.user!.email.toLowerCase()) {
      return res.status(403).json({
        error: `This invite was sent to ${maskEmail(invite.email)}. Sign in with that email to accept it.`,
        code: "INVITE_EMAIL_MISMATCH",
      });
    }

    const claimed = await prisma.$transaction(async (tx) => {
      const marked = await tx.teamInvite.updateMany({
        where: { id: invite.id, acceptedAt: null },
        data: { acceptedAt: new Date() },
      });
      if (marked.count === 0) return false;
      await tx.tenantAdmin.upsert({
        where: { tenantId_userId: { tenantId: invite.tenantId, userId: req.user!.id } },
        create: { tenantId: invite.tenantId, userId: req.user!.id, role: invite.role, permissions: {} },
        update: {},
      });
      // The emailed token proves the invitee controls this address.
      await tx.user.update({
        where: { id: req.user!.id },
        data: {
          ...(req.user!.role === "buyer" ? { role: "tenant_admin" as const } : {}),
          ...(req.user!.emailVerifiedAt ? {} : { emailVerifiedAt: new Date() }),
        },
      });
      return true;
    });
    if (!claimed) return res.status(404).json({ error: "This invite is invalid or has expired." });

    setActiveShopCookie(res, invite.tenantId);
    return res.json({ ok: true, shopName: invite.tenant.name, tenantId: invite.tenantId });
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

const domainVerifyLimiter = redisRateLimit({
  name: "domain-verify",
  windowMs: 60 * 1000,
  max: 6,
  by: "tenant",
  message: "Too many checks. Wait a minute and try again.",
});

sellerDomainRouter.post("/verify", ownerOnly, domainVerifyLimiter, async (req, res, next) => {
  try {
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

sellerDomainRouter.put("/", ownerOnly, async (req, res, next) => {
  try {
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
    const allowed = await planAllows(tenant.id, "whatsapp");
    return res.json({
      whatsappOrdersEnabled: allowed && !!settings.whatsappOrdersEnabled,
      whatsappAllowed: allowed,
      whatsappNumber: tenant.owner.whatsappNumber,
      phone: tenant.owner.phone,
    });
  } catch (err) {
    return next(err);
  }
});

sellerNotificationsRouter.put("/", requireTenantRoles("owner", "manager"), async (req, res, next) => {
  try {
    const body = z
      .object({
        whatsappOrdersEnabled: z.boolean().optional(),
        whatsappNumber: z.string().min(5).max(32).nullable().optional(),
      })
      .parse(req.body);

    if (body.whatsappOrdersEnabled && !(await planAllows(req.tenant!.tenantId, "whatsapp"))) {
      return res.status(403).json({
        error: "WhatsApp order alerts aren't included on your plan.",
        code: "PLAN_FEATURE",
      });
    }

    const tenant = await prisma.tenant.findUnique({
      where: { id: req.tenant!.tenantId },
    });
    if (!tenant) return res.status(404).json({ error: "Shop not found" });

    let numberToSave: string | null | undefined = body.whatsappNumber;
    if (typeof numberToSave === "string") {
      const { toE164Digits } = await import("../services/whatsapp");
      const digits = toE164Digits(numberToSave);
      if (!digits) {
        return res.status(400).json({ error: "Enter a valid phone number, e.g. 0803… or +234…" });
      }
      numberToSave = `+${digits}`;
    }

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

    if (numberToSave !== undefined) {
      await prisma.user.update({
        where: { id: updated.ownerUserId },
        data: { whatsappNumber: numberToSave },
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
      whatsappAllowed: await planAllows(tenant.id, "whatsapp"),
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
      tenant: toTenantPublic(tenant, { private: true }),
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

sellerPlanRouter.post("/upgrade", ownerOnly, async (req, res, next) => {
  try {
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
        error: "Pay for this plan to switch to it.",
        code: "PAYMENT_REQUIRED",
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
      tenant: toTenantPublic(tenant, { private: true }),
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
