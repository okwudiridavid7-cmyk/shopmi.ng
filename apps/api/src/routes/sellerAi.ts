import { Router } from "express";
import { z } from "zod";
import { prisma } from "../db/prisma";
import { requireAuth } from "../auth/middleware";
import { requireTenantFromMembership } from "../tenant/middleware";
import { tenantWhere } from "../tenant/tenantContext";
import { isAiFeaturesEnabled } from "../lib/platformSettings";
import { planAllows } from "../lib/plans";
import { AiQuotaError, aiUsage, reserveAiJob } from "../lib/aiQuota";
import { redisRateLimit } from "../lib/rateLimit";
import { keyFromPublicUrl } from "../lib/storage";
import { aiDescriptionConfigured } from "../services/aiDescription";
import { enhancerConfigured } from "../services/imageEnhance";
import {
  getDescriptionQueue,
  getImageEnhanceQueue,
  type DescriptionJobPayload,
  type EnhanceJobPayload,
} from "../queue/connection";

const aiLimiter = redisRateLimit({
  name: "seller-ai",
  windowMs: 15 * 60 * 1000,
  max: 40,
  by: "tenant",
});

const enqueueSchema = z.object({
  title: z.string().min(2).max(200),
  categoryId: z.string().optional(),
  shopCategoryId: z.string().optional(),
  brandName: z.string().max(120).optional(),
  location: z.string().max(120).optional(),
  productId: z.string().optional(),
});

const enhanceSchema = z.object({
  imageUrl: z.string().url().max(2048),
});

export const sellerAiRouter = Router();

sellerAiRouter.use(requireAuth, requireTenantFromMembership());

sellerAiRouter.get("/features", async (req, res, next) => {
  try {
    const tenantId = req.tenant!.tenantId;
    const [platform, planAi, descQuota, enhanceQuota] = await Promise.all([
      isAiFeaturesEnabled(),
      planAllows(tenantId, "ai"),
      aiUsage(tenantId, "description"),
      aiUsage(tenantId, "enhance"),
    ]);
    const ai = platform && planAi;
    return res.json({
      aiFeaturesEnabled: ai && aiDescriptionConfigured(),
      aiPlatformEnabled: platform,
      aiPlanAllows: planAi,
      aiConfigured: aiDescriptionConfigured(),
      imageEnhanceEnabled: ai && enhancerConfigured(),
      descriptionQuota: descQuota,
      enhanceQuota: enhanceQuota,
    });
  } catch (err) {
    return next(err);
  }
});

/**
 * Enqueue AI description - returns immediately with job id.
 * Poll GET /api/seller/ai/jobs/:id for result (not rate-limited).
 */
sellerAiRouter.post("/description", aiLimiter, async (req, res, next) => {
  try {
    if (!(await isAiFeaturesEnabled())) {
      return res.status(403).json({
        error: "AI features are disabled by the platform administrator",
      });
    }
    if (!(await planAllows(req.tenant!.tenantId, "ai"))) {
      return res.status(403).json({
        error: "AI listing help is available on paid plans.",
        code: "PLAN_FEATURE",
      });
    }
    if (!aiDescriptionConfigured()) {
      return res.status(503).json({
        error: "AI descriptions aren't set up on this platform yet.",
        code: "AI_NOT_CONFIGURED",
      });
    }

    const body = enqueueSchema.parse(req.body);
    const tenantId = req.tenant!.tenantId;

    if (body.productId) {
      const product = await prisma.product.findFirst({
        where: tenantWhere(req.tenant!, { id: body.productId }),
      });
      if (!product) return res.status(404).json({ error: "Product not found" });
    }

    let categoryName: string | undefined;
    if (body.categoryId) {
      const cat = await prisma.category.findUnique({ where: { id: body.categoryId } });
      categoryName = cat?.name;
    }
    let shopCategoryName: string | undefined;
    if (body.shopCategoryId) {
      const sc = await prisma.shopCategory.findFirst({
        where: tenantWhere(req.tenant!, { id: body.shopCategoryId }),
      });
      shopCategoryName = sc?.name;
    }

    const aiJob = await reserveAiJob({
      tenantId,
      userId: req.user!.id,
      kind: "description",
      productId: body.productId ?? null,
      input: {
        title: body.title,
        categoryId: body.categoryId,
        shopCategoryId: body.shopCategoryId,
        brandName: body.brandName,
        location: body.location,
      },
    });

    const payload: DescriptionJobPayload = {
      aiJobId: aiJob.id,
      tenantId,
      title: body.title,
      categoryName,
      shopCategoryName,
      brandName: body.brandName,
      location: body.location,
      productId: body.productId,
    };

    await getDescriptionQueue().add("generate", payload, { jobId: aiJob.id });

    return res.status(202).json({
      job: { id: aiJob.id, status: aiJob.status, type: aiJob.type },
    });
  } catch (err) {
    if (err instanceof AiQuotaError) {
      return res.status(err.status).json({ error: err.message, code: err.code });
    }
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: "Validation failed", details: err.flatten() });
    }
    return next(err);
  }
});

/**
 * Enqueue background removal + enhance for a product image the shop already uploaded.
 */
sellerAiRouter.post("/enhance", aiLimiter, async (req, res, next) => {
  try {
    if (!(await isAiFeaturesEnabled())) {
      return res.status(403).json({ error: "AI features are disabled by the platform administrator" });
    }
    if (!(await planAllows(req.tenant!.tenantId, "ai"))) {
      return res.status(403).json({
        error: "Photo enhancement is available on paid plans.",
        code: "PLAN_FEATURE",
      });
    }
    if (!enhancerConfigured()) {
      return res.status(503).json({
        error: "Background removal isn't set up on this platform yet.",
        code: "AI_NOT_CONFIGURED",
      });
    }

    const body = enhanceSchema.parse(req.body);
    const tenantId = req.tenant!.tenantId;
    const key = keyFromPublicUrl(body.imageUrl);
    if (!key || !key.startsWith(`t/${tenantId}/`)) {
      return res.status(400).json({ error: "That image isn't one of yours." });
    }

    const aiJob = await reserveAiJob({
      tenantId,
      userId: req.user!.id,
      kind: "enhance",
      input: { sourceKey: key, imageUrl: body.imageUrl },
    });

    const payload: EnhanceJobPayload = { aiJobId: aiJob.id, tenantId, sourceKey: key };
    await getImageEnhanceQueue().add("enhance", payload, { jobId: aiJob.id });

    return res.status(202).json({
      job: { id: aiJob.id, status: aiJob.status, type: aiJob.type },
    });
  } catch (err) {
    if (err instanceof AiQuotaError) {
      return res.status(err.status).json({ error: err.message, code: err.code });
    }
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: "Validation failed", details: err.flatten() });
    }
    return next(err);
  }
});

/** Polling is not rate-limited so sellers can wait without burning their AI budget. */
sellerAiRouter.get("/jobs/:id", async (req, res, next) => {
  try {
    const job = await prisma.aiJob.findFirst({
      where: tenantWhere(req.tenant!, { id: req.params.id }),
    });
    if (!job) return res.status(404).json({ error: "Job not found" });
    const result = job.result as {
      description?: string;
      originalUrl?: string;
      watermarkedUrl?: string;
    } | null;
    return res.json({
      job: {
        id: job.id,
        type: job.type,
        status: job.status,
        description: result?.description ?? null,
        originalUrl: result?.originalUrl ?? null,
        watermarkedUrl: result?.watermarkedUrl ?? null,
        error: job.error,
        completedAt: job.completedAt?.toISOString() ?? null,
      },
    });
  } catch (err) {
    return next(err);
  }
});
