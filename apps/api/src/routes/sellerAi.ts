import { Router } from "express";
import rateLimit from "express-rate-limit";
import { z } from "zod";
import { prisma } from "../db/prisma";
import { requireAuth } from "../auth/middleware";
import { requireTenantFromMembership } from "../tenant/middleware";
import { tenantWhere } from "../tenant/tenantContext";
import { isAiFeaturesEnabled } from "../lib/platformSettings";
import {
  getDescriptionQueue,
  type DescriptionJobPayload,
} from "../queue/connection";

const aiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 40,
  standardHeaders: true,
  legacyHeaders: false,
});

const enqueueSchema = z.object({
  title: z.string().min(2).max(200),
  categoryId: z.string().optional(),
  shopCategoryId: z.string().optional(),
  brandName: z.string().max(120).optional(),
  location: z.string().max(120).optional(),
  price: z.coerce.number().positive().optional(),
  currency: z.string().length(3).optional(),
  productId: z.string().optional(),
});

export const sellerAiRouter = Router();

sellerAiRouter.use(requireAuth, requireTenantFromMembership(), aiLimiter);

sellerAiRouter.get("/features", async (_req, res, next) => {
  try {
    const enabled = await isAiFeaturesEnabled();
    return res.json({ aiFeaturesEnabled: enabled });
  } catch (err) {
    return next(err);
  }
});

/**
 * Enqueue AI description — returns immediately with job id.
 * Poll GET /api/seller/ai/jobs/:id for result.
 */
sellerAiRouter.post("/description", async (req, res, next) => {
  try {
    if (!(await isAiFeaturesEnabled())) {
      return res.status(403).json({
        error: "AI features are disabled by the platform administrator",
      });
    }

    const body = enqueueSchema.parse(req.body);

    if (body.productId) {
      const product = await prisma.product.findFirst({
        where: tenantWhere(req.tenant!, { id: body.productId }),
      });
      if (!product) {
        return res.status(404).json({ error: "Product not found" });
      }
    }

    let categoryName: string | undefined;
    if (body.categoryId) {
      const cat = await prisma.category.findUnique({
        where: { id: body.categoryId },
      });
      categoryName = cat?.name;
    }

    let shopCategoryName: string | undefined;
    if (body.shopCategoryId) {
      const sc = await prisma.shopCategory.findFirst({
        where: tenantWhere(req.tenant!, { id: body.shopCategoryId }),
      });
      shopCategoryName = sc?.name;
    }

    const aiJob = await prisma.aiJob.create({
      data: {
        tenantId: req.tenant!.tenantId,
        userId: req.user!.id,
        type: "description",
        status: "queued",
        productId: body.productId ?? null,
        input: {
          title: body.title,
          categoryId: body.categoryId,
          shopCategoryId: body.shopCategoryId,
          brandName: body.brandName,
          location: body.location,
          price: body.price,
          currency: body.currency,
        },
      },
    });

    const payload: DescriptionJobPayload = {
      aiJobId: aiJob.id,
      tenantId: req.tenant!.tenantId,
      title: body.title,
      categoryName,
      shopCategoryName,
      brandName: body.brandName,
      location: body.location,
      price: body.price,
      currency: body.currency,
      productId: body.productId,
    };

    await getDescriptionQueue().add("generate", payload, {
      jobId: aiJob.id,
    });

    return res.status(202).json({
      job: {
        id: aiJob.id,
        status: aiJob.status,
        type: aiJob.type,
      },
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: "Validation failed", details: err.flatten() });
    }
    return next(err);
  }
});

sellerAiRouter.get("/jobs/:id", async (req, res, next) => {
  try {
    const job = await prisma.aiJob.findFirst({
      where: tenantWhere(req.tenant!, { id: req.params.id }),
    });
    if (!job) {
      return res.status(404).json({ error: "Job not found" });
    }
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
