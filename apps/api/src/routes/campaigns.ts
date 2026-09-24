import { Router } from "express";
import rateLimit from "express-rate-limit";
import { z } from "zod";
import type { Campaign } from "@prisma/client";
import type {
  CampaignContent,
  CampaignPublic,
  CampaignTriggerRule,
} from "@vendors/shared-types";
import { prisma } from "../db/prisma";
import { requireAuth } from "../auth/middleware";
import {
  requireTenantFromMembership,
  requireTenantFromSlugParam,
  requireTenantRoles,
} from "../tenant/middleware";
import { tenantWhere } from "../tenant/tenantContext";

function toCampaignPublic(row: Campaign): CampaignPublic {
  return {
    id: row.id,
    tenantId: row.tenantId,
    type: row.type,
    content: row.content as unknown as CampaignContent,
    active: row.active,
    triggerRule: row.triggerRule as unknown as CampaignTriggerRule,
    createdAt: row.createdAt.toISOString(),
  };
}

const contentSchema = z.object({
  headline: z.string().min(1).max(120),
  body: z.string().min(1).max(1000),
  ctaLabel: z.string().max(60).optional(),
  ctaUrl: z.union([z.string().url(), z.literal("")]).optional(),
});

const createSchema = z.object({
  content: contentSchema,
  active: z.boolean().default(true),
  triggerRule: z
    .object({
      type: z.enum(["on_visit", "on_exit_intent"]).default("on_visit"),
    })
    .default({ type: "on_visit" }),
});

const patchSchema = z.object({
  content: contentSchema.partial().optional(),
  active: z.boolean().optional(),
  triggerRule: z
    .object({ type: z.enum(["on_visit", "on_exit_intent"]) })
    .optional(),
});

export const sellerCampaignsRouter = Router();

sellerCampaignsRouter.use(requireAuth, requireTenantFromMembership());

sellerCampaignsRouter.get("/", async (req, res, next) => {
  try {
    const campaigns = await prisma.campaign.findMany({
      where: tenantWhere(req.tenant!),
      orderBy: { createdAt: "desc" },
    });
    return res.json({ campaigns: campaigns.map(toCampaignPublic) });
  } catch (err) {
    return next(err);
  }
});

sellerCampaignsRouter.post(
  "/",
  requireTenantRoles("owner", "manager"),
  async (req, res, next) => {
  try {
    const body = createSchema.parse(req.body);
    const campaign = await prisma.campaign.create({
      data: {
        tenantId: req.tenant!.tenantId,
        type: "popup",
        content: {
          ...body.content,
          ctaUrl: body.content.ctaUrl || undefined,
        },
        active: body.active,
        triggerRule: body.triggerRule,
      },
    });
    return res.status(201).json({ campaign: toCampaignPublic(campaign) });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: "Validation failed", details: err.flatten() });
    }
    return next(err);
  }
});

sellerCampaignsRouter.patch(
  "/:id",
  requireTenantRoles("owner", "manager"),
  async (req, res, next) => {
  try {
    const body = patchSchema.parse(req.body);
    const existing = await prisma.campaign.findFirst({
      where: tenantWhere(req.tenant!, { id: req.params.id }),
    });
    if (!existing) {
      return res.status(404).json({ error: "Campaign not found" });
    }

    const prevContent = existing.content as unknown as CampaignContent;
    const campaign = await prisma.campaign.update({
      where: { id: existing.id },
      data: {
        ...(body.active != null ? { active: body.active } : {}),
        ...(body.triggerRule ? { triggerRule: body.triggerRule } : {}),
        ...(body.content
          ? {
              content: {
                ...prevContent,
                ...body.content,
                ctaUrl: body.content.ctaUrl || prevContent.ctaUrl,
              },
            }
          : {}),
      },
    });
    return res.json({ campaign: toCampaignPublic(campaign) });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: "Validation failed", details: err.flatten() });
    }
    return next(err);
  }
});

sellerCampaignsRouter.delete(
  "/:id",
  requireTenantRoles("owner", "manager"),
  async (req, res, next) => {
  try {
    const existing = await prisma.campaign.findFirst({
      where: tenantWhere(req.tenant!, { id: req.params.id }),
    });
    if (!existing) {
      return res.status(404).json({ error: "Campaign not found" });
    }
    await prisma.campaign.delete({ where: { id: existing.id } });
    return res.json({ ok: true });
  } catch (err) {
    return next(err);
  }
});

const publicCampaignLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
});

/** Mount under /api/shops — GET /:slug/campaigns/active */
export const shopCampaignsRouter = Router({ mergeParams: true });

shopCampaignsRouter.get(
  "/active",
  publicCampaignLimiter,
  requireTenantFromSlugParam("slug"),
  async (req, res, next) => {
    try {
      const campaigns = await prisma.campaign.findMany({
        where: tenantWhere(req.tenant!, { active: true }),
        orderBy: { createdAt: "desc" },
      });
      const onVisit = campaigns.filter((c) => {
        const rule = c.triggerRule as unknown as CampaignTriggerRule;
        return rule?.type === "on_visit" && c.type === "popup";
      });
      return res.json({ campaigns: onVisit.map(toCampaignPublic) });
    } catch (err) {
      return next(err);
    }
  }
);
