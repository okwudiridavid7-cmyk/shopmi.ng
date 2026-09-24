import { Router } from "express";
import { z } from "zod";
import { prisma } from "../db/prisma";
import { env } from "../config/env";
import { requireAuth } from "../auth/middleware";
import { requireTenantFromMembership } from "../tenant/middleware";
import { tenantWhere } from "../tenant/tenantContext";
import { decimalToNumber, toTenantPublic, toUserPublic } from "../lib/serialize";

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

sellerDomainRouter.get("/", async (req, res, next) => {
  try {
    const tenant = await prisma.tenant.findUnique({
      where: { id: req.tenant!.tenantId },
    });
    if (!tenant) return res.status(404).json({ error: "Shop not found" });
    return res.json({
      customDomain: tenant.customDomain,
      cnameTarget: env.shopBaseDomain,
      instructions: [
        `Create a CNAME record for your domain pointing to ${env.shopBaseDomain}.`,
        "SSL provisioning is not automated in this environment — use a reverse proxy or CDN that terminates TLS.",
        `Until DNS propagates, your shop remains at /shops/${tenant.slug}.`,
      ],
      tenant: toTenantPublic(tenant),
    });
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
      .object({
        customDomain: z
          .string()
          .min(3)
          .max(253)
          .regex(/^[a-z0-9.-]+$/i)
          .nullable(),
      })
      .parse(req.body);

    const domain = body.customDomain
      ? body.customDomain.toLowerCase().replace(/^https?:\/\//, "").split("/")[0]
      : null;

    if (domain) {
      const taken = await prisma.tenant.findFirst({
        where: {
          customDomain: domain,
          NOT: { id: req.tenant!.tenantId },
        },
      });
      if (taken) {
        return res.status(409).json({ error: "Domain already linked to another shop" });
      }
    }

    const tenant = await prisma.tenant.update({
      where: { id: req.tenant!.tenantId },
      data: { customDomain: domain },
    });
    return res.json({
      customDomain: tenant.customDomain,
      cnameTarget: env.shopBaseDomain,
      tenant: toTenantPublic(tenant),
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
    const tenant = await prisma.tenant.findUnique({
      where: { id: req.tenant!.tenantId },
      include: { plan: true, _count: { select: { products: true } } },
    });
    if (!tenant) return res.status(404).json({ error: "Shop not found" });

    const plans = await prisma.plan.findMany({
      where: { active: true },
      orderBy: { price: "asc" },
    });

    const trialEndsAt = tenant.trialEndsAt;
    const trialActive =
      trialEndsAt != null && trialEndsAt.getTime() > Date.now();
    const trialDaysLeft = trialActive
      ? Math.ceil((trialEndsAt!.getTime() - Date.now()) / (24 * 60 * 60 * 1000))
      : 0;

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
      trialActive,
      trialDaysLeft,
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

    const tenant = await prisma.tenant.update({
      where: { id: req.tenant!.tenantId },
      data: { planId: plan.id },
      include: { plan: true },
    });

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
          }
        : null,
      note: "Billing is not connected yet — plan assignment is recorded for gating.",
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
