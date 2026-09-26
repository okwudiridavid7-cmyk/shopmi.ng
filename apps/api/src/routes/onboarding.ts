import { Router } from "express";
import rateLimit from "express-rate-limit";
import { z } from "zod";
import type { User } from "@prisma/client";
import { prisma } from "../db/prisma";
import { optionalAuth } from "../auth/middleware";
import { hashPassword } from "../auth/password";
import { setAuthCookies } from "../auth/cookies";
import { issueRefreshToken, signAccessToken } from "../auth/tokens";
import { isReservedSlug } from "../lib/slugify";
import { toProductPublic, toTenantPublic, toUserPublic } from "../lib/serialize";

const onboardingLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
});

const accountSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(128),
  phone: z.string().min(5).max(32).optional(),
});

const onboardingSchema = z.object({
  /** Required when not already authenticated — creates the seller user. */
  account: accountSchema.optional(),
  shopName: z.string().min(2).max(100),
  slug: z
    .string()
    .min(2)
    .max(63)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  location: z.string().min(2).max(120).optional(),
  countryCode: z.string().length(2).optional(),
  stateCode: z.string().max(10).optional(),
  logoUrl: z.string().min(1).optional(),
  answers: z
    .object({
      categoryFocus: z.string().optional(),
      sellingExperience: z.string().optional(),
      fulfillmentMethod: z.string().optional(),
      weeklyOrders: z.string().optional(),
      currencies: z.array(z.string()).optional(),
      staffCount: z.string().optional(),
      physicalStores: z.string().optional(),
    })
    .default({}),
  firstProduct: z
    .object({
      title: z.string().min(2).max(200),
      description: z.string().min(1).max(10_000),
      price: z.coerce.number().positive(),
      compareAtPrice: z.coerce.number().positive().optional(),
      currency: z.string().length(3).default("NGN"),
      stockQty: z.coerce.number().int().min(0).default(1),
      categoryId: z.string().optional(),
      shopCategoryId: z.string().optional(),
      brandName: z.string().max(120).optional(),
      brandId: z.string().optional(),
      location: z.string().max(120).optional(),
      countryCode: z.string().length(2).optional(),
      stateCode: z.string().max(10).optional(),
      images: z.array(z.string()).max(10).default([]),
      status: z.enum(["draft", "active"]).default("active"),
    })
    .optional(),
});

export const onboardingRouter = Router();

/**
 * POST /api/onboarding — guided seller flow in one request:
 * account (if needed) → tenant + owner → optional first product.
 * Sets auth cookies when a new account is created (or when already logged in).
 */
onboardingRouter.post(
  "/",
  onboardingLimiter,
  optionalAuth,
  async (req, res, next) => {
    try {
      const body = onboardingSchema.parse(req.body);
      const slug = body.slug.toLowerCase();

      if (!req.user && !body.account) {
        return res.status(400).json({
          error: "account is required (email + password) to create a seller",
        });
      }

      if (isReservedSlug(slug)) {
        return res.status(409).json({ error: "Slug is reserved" });
      }
      const existingSlug = await prisma.tenant.findUnique({ where: { slug } });
      if (existingSlug) {
        return res.status(409).json({ error: "Slug already taken" });
      }

      if (req.user) {
        const existingMembership = await prisma.tenantAdmin.findFirst({
          where: { userId: req.user.id },
        });
        if (existingMembership) {
          return res.status(409).json({
            error: "User already belongs to a tenant",
          });
        }
      }

      if (body.account) {
        const emailTaken = await prisma.user.findUnique({
          where: { email: body.account.email.toLowerCase() },
        });
        if (emailTaken && (!req.user || emailTaken.id !== req.user.id)) {
          return res.status(409).json({ error: "Email already registered" });
        }
      }

      const result = await prisma.$transaction(async (tx) => {
        let user: User;

        if (req.user && !body.account) {
          user = req.user;
          if (user.role === "buyer") {
            user = await tx.user.update({
              where: { id: user.id },
              data: { role: "seller" },
            });
          }
        } else {
          const account = body.account!;
          user = await tx.user.create({
            data: {
              email: account.email.toLowerCase(),
              passwordHash: await hashPassword(account.password),
              role: "seller",
              phone: account.phone,
            },
          });
        }

        const trialPlan =
          (await tx.plan.findUnique({ where: { slug: "yomi" } })) ??
          (await tx.plan.findUnique({ where: { slug: "free" } }));
        const { getPlatformTrialDays } = await import("../lib/platformSettings");
        const trialDays = await getPlatformTrialDays(trialPlan?.trialDays ?? 3);
        const trialEndsAt = new Date(
          Date.now() + trialDays * 24 * 60 * 60 * 1000
        );

        const tenant = await tx.tenant.create({
          data: {
            name: body.shopName,
            slug,
            ownerUserId: user.id,
            status: "pending_verification",
            location: body.location ?? null,
            countryCode: body.countryCode?.toUpperCase() ?? null,
            stateCode: body.stateCode ?? null,
            onboardingAnswers: body.answers,
            themeSettings: body.logoUrl ? { logoUrl: body.logoUrl } : undefined,
            planId: trialPlan?.id ?? null,
            trialEndsAt,
            notificationSettings: { whatsappOrdersEnabled: false },
          },
        });

        await tx.tenantAdmin.create({
          data: {
            tenantId: tenant.id,
            userId: user.id,
            role: "owner",
            permissions: {},
          },
        });

        let product = null;
        if (body.firstProduct) {
          const fp = body.firstProduct;
          product = await tx.product.create({
            data: {
              tenantId: tenant.id,
              title: fp.title,
              description: fp.description,
              price: fp.price,
              compareAtPrice: fp.compareAtPrice ?? null,
              currency: fp.currency,
              stockQty: fp.stockQty,
              categoryId: fp.categoryId ?? null,
              shopCategoryId: fp.shopCategoryId ?? null,
              brandName: fp.brandName ?? null,
              brandId: fp.brandId ?? null,
              location: fp.location ?? body.location ?? null,
              countryCode:
                fp.countryCode?.toUpperCase() ??
                body.countryCode?.toUpperCase() ??
                null,
              stateCode: fp.stateCode ?? body.stateCode ?? null,
              images: fp.images,
              status: fp.status,
            },
            include: {
              category: true,
              shopCategory: true,
              brand: true,
              tenant: { select: { id: true, name: true, slug: true } },
            },
          });
        }

        return { user, tenant, product };
      });

      const accessToken = signAccessToken({
        sub: result.user.id,
        email: result.user.email,
        role: result.user.role,
      });
      const refreshToken = await issueRefreshToken(result.user.id);
      setAuthCookies(res, accessToken, refreshToken);

      return res.status(201).json({
        user: toUserPublic(result.user),
        tenant: toTenantPublic(result.tenant),
        product: result.product ? toProductPublic(result.product) : null,
      });
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res
          .status(400)
          .json({ error: "Validation failed", details: err.flatten() });
      }
      return next(err);
    }
  }
);
