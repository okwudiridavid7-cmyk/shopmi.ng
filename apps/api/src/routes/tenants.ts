import { Router } from "express";
import { z } from "zod";
import { prisma } from "../db/prisma";
import { env } from "../config/env";
import { requireAuth } from "../auth/middleware";
import { requireTenantFromMembership } from "../tenant/middleware";
import { tenantWhere } from "../tenant/tenantContext";
import { toTenantPublic } from "../lib/serialize";
import { isReservedSlug } from "../lib/slugify";

const createTenantSchema = z.object({
  name: z.string().min(2).max(100),
  slug: z
    .string()
    .min(2)
    .max(63)
    .regex(
      /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
      "Slug must be lowercase alphanumeric with hyphens"
    ),
  location: z.string().max(120).optional(),
});

export const tenantsRouter = Router();

import {
  isVerificationRequired,
  getPlatformTrialDays,
  getPlatformSetting,
  isBillingEnabled,
  getCommissionPercent,
} from "../lib/platformSettings";

function parseTicker(raw: string | null): {
  enabled: boolean;
  text: string;
  speed: number;
  backgroundColor: string;
  textColor: string;
} | null {
  if (!raw) return null;
  try {
    const v = JSON.parse(raw) as Record<string, unknown>;
    const text = typeof v.text === "string" ? v.text.trim() : "";
    if (!text) return null;
    return {
      enabled: v.enabled !== false,
      text,
      speed: Math.min(30, Math.max(4, Number(v.speed) || 12)),
      backgroundColor:
        typeof v.backgroundColor === "string" ? v.backgroundColor : "#111111",
      textColor: typeof v.textColor === "string" ? v.textColor : "#ffffff",
    };
  } catch {
    return null;
  }
}

/** Public: shop base domain + branding for chrome / onboarding. */
tenantsRouter.get("/config", async (_req, res, next) => {
  try {
    const [
      verificationRequired,
      trialDays,
      billingEnabled,
      commissionPercent,
      appName,
      supportEmail,
      logoUrl,
      logoSquareUrl,
      tickerRaw,
      whatsappUrl,
      chatbotHtml,
      webUrlSetting,
    ] = await Promise.all([
      isVerificationRequired(),
      getPlatformTrialDays(3),
      isBillingEnabled(),
      getCommissionPercent(5),
      getPlatformSetting("app_name", env.appName),
      getPlatformSetting("support_email", "support@shopmi.ng"),
      getPlatformSetting("platform_logo_url", ""),
      getPlatformSetting("platform_logo_square_url", ""),
      getPlatformSetting("homepage_ticker", ""),
      getPlatformSetting("whatsapp_url", ""),
      getPlatformSetting("chatbot_html", ""),
      getPlatformSetting("web_url", env.webUrl),
    ]);
    return res.json({
      shopBaseDomain: env.shopBaseDomain,
      verificationRequired,
      trialDays,
      billingEnabled,
      commissionPercent,
      branding: {
        appName: appName || env.appName,
        webUrl: webUrlSetting || env.webUrl,
        logoUrl: logoUrl || null,
        logoSquareUrl: logoSquareUrl || logoUrl || null,
        supportEmail,
        ticker: parseTicker(tickerRaw || null),
        whatsappUrl: whatsappUrl || null,
        chatbotHtml: chatbotHtml || null,
        turnstileSiteKey: env.turnstileSiteKey || null,
        shopContactConfirmRequired: env.shopContactConfirmRequired,
        billingEnabled,
        commissionPercent,
      },
    });
  } catch (err) {
    return next(err);
  }
});

/** Public: check slug availability. */
tenantsRouter.get("/slug-available", async (req, res, next) => {
  try {
    const slug = String(req.query.slug ?? "")
      .toLowerCase()
      .trim();
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) || slug.length < 2) {
      return res.json({
        slug,
        available: false,
        reason: "Invalid slug format",
      });
    }
    if (isReservedSlug(slug)) {
      return res.json({ slug, available: false, reason: "Reserved" });
    }
    const existing = await prisma.tenant.findUnique({ where: { slug } });
    return res.json({
      slug,
      available: !existing,
      reason: existing ? "Already taken" : null,
    });
  } catch (err) {
    return next(err);
  }
});

tenantsRouter.post("/", requireAuth, async (req, res, next) => {
  try {
    const body = createTenantSchema.parse(req.body);
    const user = req.user!;
    const slug = body.slug.toLowerCase();

    if (isReservedSlug(slug)) {
      return res.status(409).json({ error: "Slug is reserved" });
    }

    const existingSlug = await prisma.tenant.findUnique({ where: { slug } });
    if (existingSlug) {
      return res.status(409).json({ error: "Slug already taken" });
    }

    const existingMembership = await prisma.tenantAdmin.findFirst({
      where: { userId: user.id },
    });
    if (existingMembership) {
      return res.status(409).json({
        error: "User already belongs to a tenant (Phase 0: one shop per user)",
      });
    }

    const { getDefaultTrialPlan } = await import("../lib/plans");
    const trialPlan = await getDefaultTrialPlan();
    const { getPlatformTrialDays } = await import("../lib/platformSettings");
    const trialDays =
      (await getPlatformTrialDays(trialPlan?.trialDays ?? 3)) ?? 3;
    const trialEndsAt = new Date(Date.now() + trialDays * 24 * 60 * 60 * 1000);

    const tenant = await prisma.$transaction(async (tx) => {
      const created = await tx.tenant.create({
        data: {
          name: body.name,
          slug,
          ownerUserId: user.id,
          status: "pending_verification",
          location: body.location ?? null,
          planId: trialPlan?.id ?? null,
          trialEndsAt,
          notificationSettings: { whatsappOrdersEnabled: false },
        },
      });

      await tx.tenantAdmin.create({
        data: {
          tenantId: created.id,
          userId: user.id,
          role: "owner",
          permissions: {},
        },
      });

      if (user.role === "buyer") {
        await tx.user.update({
          where: { id: user.id },
          data: { role: "seller" },
        });
      }

      return created;
    });

    return res.status(201).json({ tenant: toTenantPublic(tenant) });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res
        .status(400)
        .json({ error: "Validation failed", details: err.flatten() });
    }
    return next(err);
  }
});

tenantsRouter.get(
  "/me",
  requireAuth,
  requireTenantFromMembership(),
  async (req, res, next) => {
    try {
      const membership = await prisma.tenantAdmin.findFirst({
        where: tenantWhere(req.tenant!, { userId: req.user!.id }),
        include: { tenant: true },
      });

      if (!membership) {
        return res.status(404).json({ error: "Tenant membership not found" });
      }

      return res.json({
        tenant: toTenantPublic(membership.tenant),
        context: req.tenant,
        membershipRole: membership.role,
      });
    } catch (err) {
      return next(err);
    }
  }
);
