import { Router } from "express";
import { z } from "zod";
import { prisma } from "../db/prisma";
import { requireAuth, requireRoles } from "../auth/middleware";

/**
 * platform_settings — super-admin editable, no redeploy required.
 *
 * SEPARATE FROM .env SECRETS:
 * - .env holds secrets that must NOT be click-editable: JWT secrets, Google OAuth
 *   client secret, DATABASE_URL, Redis URL, Paystack keys, S3 credentials, etc.
 *   Changing those requires updating env + redeploying.
 * - This table holds non-secret sitewide config: app_name, feature toggles,
 *   support email, trial length, commission %, theme defaults, etc.
 *   Super admins can change these via API and they take effect on the next read.
 */
export const platformSettingsRouter = Router();

const upsertSchema = z.object({
  key: z
    .string()
    .min(1)
    .max(100)
    .regex(/^[a-z0-9_]+$/, "Key must be snake_case alphanumeric"),
  value: z.string().max(100_000),
});

const bulkSchema = z.object({
  settings: z.array(upsertSchema).min(1).max(50),
});

platformSettingsRouter.use(requireAuth, requireRoles("super_admin"));

platformSettingsRouter.get("/", async (_req, res, next) => {
  try {
    const settings = await prisma.platformSetting.findMany({
      orderBy: { key: "asc" },
    });
    return res.json({ settings });
  } catch (err) {
    return next(err);
  }
});

platformSettingsRouter.get("/:key", async (req, res, next) => {
  try {
    const setting = await prisma.platformSetting.findUnique({
      where: { key: req.params.key },
    });
    if (!setting) {
      return res.status(404).json({ error: "Setting not found" });
    }
    return res.json({ setting });
  } catch (err) {
    return next(err);
  }
});

platformSettingsRouter.put("/:key", async (req, res, next) => {
  try {
    const parsed = upsertSchema.parse({
      key: req.params.key,
      value: req.body?.value,
    });

    const setting = await prisma.platformSetting.upsert({
      where: { key: parsed.key },
      create: { key: parsed.key, value: parsed.value },
      update: { value: parsed.value },
    });

    return res.json({ setting });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: "Validation failed", details: err.flatten() });
    }
    return next(err);
  }
});

platformSettingsRouter.put("/", async (req, res, next) => {
  try {
    const body = bulkSchema.parse(req.body);
    const settings = await prisma.$transaction(
      body.settings.map((s) =>
        prisma.platformSetting.upsert({
          where: { key: s.key },
          create: { key: s.key, value: s.value },
          update: { value: s.value },
        })
      )
    );
    return res.json({ settings });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: "Validation failed", details: err.flatten() });
    }
    return next(err);
  }
});
