import { Router } from "express";
import { redisRateLimit } from "../lib/rateLimit";
import { z } from "zod";
import crypto from "crypto";
import type { User } from "@prisma/client";
import { prisma } from "../db/prisma";
import { env } from "../config/env";
import { enqueueTransactionalMail } from "../queue/transactionalMail";
import { optionalAuth } from "../auth/middleware";
import { hashPassword } from "../auth/password";
import { setAuthCookies } from "../auth/cookies";
import { issueRefreshToken, signAccessToken } from "../auth/tokens";
import { isReservedSlug } from "../lib/slugify";
import { toTenantPublic, toUserPublic } from "../lib/serialize";
import { ownMediaUrl } from "../lib/uploads";
import { isHoneypotFilled } from "../lib/honeypot";

const onboardingLimiter = redisRateLimit({
  name: "onboarding",
  windowMs: 15 * 60 * 1000,
  max: 30,
  by: "ip",
});

const accountSchema = z.object({
  name: z.string().trim().min(1).max(120).optional(),
  email: z.string().email(),
  password: z.string().min(8).max(128),
  phone: z.string().min(5).max(32).optional(),
});

const onboardingSchema = z.object({
  /** Required when not already authenticated - creates the seller user. */
  account: accountSchema.optional(),
  shopName: z.string().min(2).max(100),
  slug: z
    .string()
    .min(2)
    .max(63)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  /** Optional plan slug from /onboarding?plan=…; falls back to default trial. */
  planSlug: z.string().min(1).max(64).optional(),
  location: z.string().min(2).max(120).optional(),
  countryCode: z.string().length(2).optional(),
  stateCode: z.string().max(10).optional(),
  logoUrl: ownMediaUrl.optional(),
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
});

export const onboardingRouter = Router();

/**
 * POST /api/onboarding - guided seller flow in one request:
 * account (if needed) → tenant + owner → optional first product.
 * Sets auth cookies when a new account is created (or when already logged in).
 */
onboardingRouter.post(
  "/",
  onboardingLimiter,
  optionalAuth,
  async (req, res, next) => {
    try {
      if (isHoneypotFilled(req.body?.faxNumber)) {
        return res.status(400).json({ error: "Unable to process request." });
      }
      if (req.body?.firstProduct) {
        return res.status(409).json({ error: "Finish your shop setup in the seller dashboard before adding your first product.", code: "SELLER_SETUP_INCOMPLETE" });
      }
      const body = onboardingSchema.parse(req.body);
      // A signed-in user always onboards as themselves.
      if (req.user) delete body.account;
      if (!req.user) {
        return res.status(401).json({ error: "Create and verify your seller account before setting up a shop." });
      }
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

      const creatingAccount = !(req.user && !body.account);
      const verifyRaw = crypto.randomBytes(32).toString("hex");
      const verifyHash = crypto.createHash("sha256").update(verifyRaw).digest("hex");

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
              name: account.name,
              email: account.email.toLowerCase(),
              passwordHash: await hashPassword(account.password),
              role: "seller",
              phone: account.phone,
              emailVerificationToken: verifyHash,
              emailVerificationExpires: new Date(Date.now() + 24 * 60 * 60 * 1000),
            },
          });
        }

        const { getDefaultTrialPlan } = await import("../lib/plans");
        let trialPlan = body.planSlug
          ? await tx.plan.findFirst({
              where: { slug: body.planSlug, active: true },
            })
          : null;
        if (!trialPlan) trialPlan = await getDefaultTrialPlan();
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

        return { user, tenant };
      });

      const accessToken = signAccessToken({
        sub: result.user.id,
        email: result.user.email,
        role: result.user.role,
      });
      const refreshToken = await issueRefreshToken(result.user.id);
      setAuthCookies(res, accessToken, refreshToken);

      if (creatingAccount) {
        const user = result.user;
        void enqueueTransactionalMail({
          kind: "welcome",
          to: user.email,
          data: { name: user.name, appName: env.appName, dashboardUrl: `${env.webUrl}/seller` },
          idempotencyKey: `welcome:${user.id}`,
        }).catch((e) => console.warn("[onboarding] welcome mail enqueue failed", e));
        void enqueueTransactionalMail({
          kind: "verify_email",
          to: user.email,
          data: { name: user.name, verifyUrl: `${env.webUrl}/verify-email?token=${verifyRaw}` },
          idempotencyKey: `verify:${user.id}:${verifyHash.slice(0, 12)}`,
        }).catch((e) => console.warn("[onboarding] verify mail enqueue failed", e));
      }

      return res.status(201).json({
        user: toUserPublic(result.user),
        tenant: toTenantPublic(result.tenant, { private: true }),
        product: null,
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
