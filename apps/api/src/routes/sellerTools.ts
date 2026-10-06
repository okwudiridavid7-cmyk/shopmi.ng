import { Router } from "express";
import { z } from "zod";
import { prisma } from "../db/prisma";
import { requireAuth } from "../auth/middleware";
import { requireTenantFromMembership, requireTenantRoles } from "../tenant/middleware";
import { isAiFeaturesEnabled, isWatermarkDefaultOn } from "../lib/platformSettings";
import { getWatermarkPrefs } from "../lib/watermarkSettings";
import { LOGO_FONT_PAIRS, LOGO_ICON_CATALOG } from "../lib/logoCatalog";
import { redisRateLimit } from "../lib/rateLimit";
import { buildShopLogos, generateLogo, logoPresets } from "../services/images";
import { planAllows } from "../lib/plans";
import { enhancerConfigured } from "../services/imageEnhance";
import { aiDescriptionConfigured } from "../services/aiDescription";

export const sellerToolsRouter = Router();

sellerToolsRouter.use(requireAuth, requireTenantFromMembership());

const toolsLimiter = redisRateLimit({
  name: "seller-tools",
  windowMs: 10 * 60_000,
  max: 40,
  by: "tenant",
});

sellerToolsRouter.get("/features", async (req, res, next) => {
  try {
    const tenantId = req.tenant!.tenantId;
    const [ai, watermarkDefault, wm, planAi] = await Promise.all([
      isAiFeaturesEnabled(),
      isWatermarkDefaultOn(),
      getWatermarkPrefs(tenantId),
      planAllows(tenantId, "ai"),
    ]);
    return res.json({
      aiFeaturesEnabled: ai && planAi && aiDescriptionConfigured(),
      aiPlatformEnabled: ai,
      aiPlanAllows: planAi,
      imageEnhanceEnabled: ai && planAi && enhancerConfigured(),
      watermarkDefaultOn: wm.shopOverride ?? watermarkDefault,
      watermarkPlatformDefault: watermarkDefault,
      watermarkShopOverride: wm.shopOverride,
    });
  } catch (err) {
    return next(err);
  }
});

sellerToolsRouter.get("/logo/presets", (_req, res) => {
  return res.json({ presets: logoPresets() });
});

sellerToolsRouter.get("/logo/catalog", (_req, res) => {
  return res.json({
    icons: LOGO_ICON_CATALOG.map(({ id, label }) => ({ id, label })),
    fontPairs: LOGO_FONT_PAIRS,
    presets: logoPresets(),
  });
});

const logoSchema = z.object({
  initials: z
    .string()
    .trim()
    .min(1)
    .max(3)
    .regex(/^[\p{L}\p{N}]+$/u, "Letters and numbers only"),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  saveToTenant: z.boolean().optional(),
});

const logoBuilderSchema = z.object({
  iconId: z.string().min(1).max(64),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  fontPairId: z.string().min(1).max(64),
  saveToTenant: z.boolean().optional(),
});

const brandingRoles = requireTenantRoles("owner", "manager");

sellerToolsRouter.post("/logo/build", toolsLimiter, brandingRoles, async (req, res, next) => {
  try {
    const body = logoBuilderSchema.parse(req.body);
    const tenant = await prisma.tenant.findUnique({
      where: { id: req.tenant!.tenantId },
    });
    if (!tenant) return res.status(404).json({ error: "Shop not found" });

    const { squareUrl, rectUrl } = await buildShopLogos({
      shopName: tenant.name,
      iconId: body.iconId,
      color: body.color,
      fontPairId: body.fontPairId,
      prefix: `t/${tenant.id}/logos`,
    });

    if (body.saveToTenant) {
      const prev = (tenant.themeSettings as Record<string, unknown> | null) ?? {};
      await prisma.tenant.update({
        where: { id: tenant.id },
        data: {
          themeSettings: {
            ...prev,
            logoUrl: squareUrl,
            logoRectUrl: rectUrl,
            logoBuilder: {
              iconId: body.iconId,
              color: body.color,
              fontPairId: body.fontPairId,
            },
          },
        },
      });
    }

    return res.status(201).json({ squareUrl, rectUrl, logoUrl: squareUrl });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: "Validation failed", details: err.flatten() });
    }
    return next(err);
  }
});

sellerToolsRouter.post("/logo/generate", toolsLimiter, brandingRoles, async (req, res, next) => {
  try {
    const body = logoSchema.parse(req.body);
    const tenant = await prisma.tenant.findUnique({
      where: { id: req.tenant!.tenantId },
    });
    if (!tenant) return res.status(404).json({ error: "Shop not found" });
    const url = await generateLogo({
      initials: body.initials,
      color: body.color,
      prefix: `t/${tenant.id}/logos`,
    });

    if (body.saveToTenant) {
      const prev = (tenant.themeSettings as Record<string, unknown> | null) ?? {};
      await prisma.tenant.update({
        where: { id: tenant.id },
        data: { themeSettings: { ...prev, logoUrl: url } },
      });
    }

    return res.status(201).json({ url });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: "Validation failed", details: err.flatten() });
    }
    return next(err);
  }
});

/** Public, read-only logo colour presets for the onboarding preview. Rate-limited. */
export const logoPublicRouter = Router();

const logoPublicLimiter = redisRateLimit({
  name: "logo-public",
  windowMs: 10 * 60_000,
  max: 60,
  by: "ip",
});

logoPublicRouter.use(logoPublicLimiter);

logoPublicRouter.get("/presets", (_req, res) => {
  res.setHeader("Cache-Control", "public, max-age=3600");
  return res.json({ presets: logoPresets() });
});
