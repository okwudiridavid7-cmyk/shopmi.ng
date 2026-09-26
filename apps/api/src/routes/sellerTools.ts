import { Router } from "express";
import fs from "fs";
import multer from "multer";
import path from "path";
import { z } from "zod";
import { prisma } from "../db/prisma";
import { requireAuth } from "../auth/middleware";
import { requireTenantFromMembership } from "../tenant/middleware";
import { env } from "../config/env";
import {
  isAiFeaturesEnabled,
  isWatermarkDefaultOn,
} from "../lib/platformSettings";
import { getWatermarkPrefs } from "../lib/watermarkSettings";
import {
  LOGO_FONT_PAIRS,
  LOGO_ICON_CATALOG,
} from "../lib/logoCatalog";
import {
  enhanceImage,
  buildShopLogos,
  generateLogo,
  logoPresets,
  watermarkImage,
} from "../services/images";

const imageSchema = z.object({
  imageUrl: z.string().min(1),
});

export const sellerToolsRouter = Router();

sellerToolsRouter.use(requireAuth, requireTenantFromMembership());

sellerToolsRouter.get("/features", async (req, res, next) => {
  try {
    const [ai, watermarkDefault, wm] = await Promise.all([
      isAiFeaturesEnabled(),
      isWatermarkDefaultOn(),
      getWatermarkPrefs(req.tenant!.tenantId),
    ]);
    return res.json({
      aiFeaturesEnabled: ai,
      watermarkDefaultOn: wm.shopOverride ?? watermarkDefault,
      watermarkPlatformDefault: watermarkDefault,
      watermarkShopOverride: wm.shopOverride,
      imageToolsEnabled: true,
    });
  } catch (err) {
    return next(err);
  }
});

sellerToolsRouter.post("/images/enhance", async (req, res, next) => {
  try {
    const body = imageSchema.parse(req.body);
    const url = await enhanceImage(body.imageUrl);
    return res.json({ url });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: "Validation failed", details: err.flatten() });
    }
    return next(err);
  }
});

/** Synchronous watermark (legacy) — prefer upload + background job. */
sellerToolsRouter.post("/images/watermark", async (req, res, next) => {
  try {
    const body = imageSchema.parse(req.body);
    const tenant = await prisma.tenant.findUnique({
      where: { id: req.tenant!.tenantId },
    });
    const theme = (tenant?.themeSettings as Record<string, unknown> | null) ?? {};
    const logoUrl = typeof theme.logoUrl === "string" ? theme.logoUrl : null;
    const url = await watermarkImage(body.imageUrl, {
      text: tenant?.name ?? "Vendors",
      logoUrl,
    });
    return res.json({ url, watermarkEnabled: true });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: "Validation failed", details: err.flatten() });
    }
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
  initials: z.string().min(1).max(3),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  saveToTenant: z.boolean().optional(),
});

const logoBuilderSchema = z.object({
  iconId: z.string().min(1),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  fontPairId: z.string().min(1),
  saveToTenant: z.boolean().optional(),
});

sellerToolsRouter.post("/logo/build", async (req, res, next) => {
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

    return res.status(201).json({
      squareUrl,
      rectUrl,
      logoUrl: squareUrl,
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: "Validation failed", details: err.flatten() });
    }
    return next(err);
  }
});

sellerToolsRouter.post("/logo/generate", async (req, res, next) => {
  try {
    const body = logoSchema.parse(req.body);
    const tenant = await prisma.tenant.findUnique({
      where: { id: req.tenant!.tenantId },
    });
    const url = await generateLogo({
      initials: body.initials,
      color: body.color,
      shopName: tenant?.name,
    });

    if (body.saveToTenant && tenant) {
      const prev =
        (tenant.themeSettings as Record<string, unknown> | null) ?? {};
      await prisma.tenant.update({
        where: { id: tenant.id },
        data: {
          themeSettings: { ...prev, logoUrl: url },
        },
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

/** Public logo helpers for onboarding (no auth — generate / upload mark only). */
export const logoPublicRouter = Router();

fs.mkdirSync(path.join(env.uploadsDir, "logos"), { recursive: true });

const logoUpload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) =>
      cb(null, path.join(env.uploadsDir, "logos")),
    filename: (_req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase() || ".png";
      const safe = `.${ext.replace(/^\./, "").replace(/[^a-z0-9]/gi, "") || "png"}`;
      cb(null, `onboard-${Date.now()}-${Math.random().toString(36).slice(2, 8)}${safe}`);
    },
  }),
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (!file.mimetype.startsWith("image/")) {
      cb(new Error("Image only"));
      return;
    }
    cb(null, true);
  },
});

logoPublicRouter.get("/presets", (_req, res) => {
  return res.json({ presets: logoPresets() });
});

logoPublicRouter.post("/generate", async (req, res, next) => {
  try {
    const body = logoSchema.omit({ saveToTenant: true }).parse(req.body);
    const url = await generateLogo(body);
    return res.status(201).json({ url });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: "Validation failed", details: err.flatten() });
    }
    return next(err);
  }
});

logoPublicRouter.post("/upload", (req, res, next) => {
  logoUpload.single("file")(req, res, (err) => {
    if (err) {
      return res.status(400).json({
        error: err instanceof Error ? err.message : "Upload failed",
      });
    }
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }
    const url = `${env.apiUrl}/uploads/logos/${req.file.filename}`;
    return res.status(201).json({ url });
  });
});
