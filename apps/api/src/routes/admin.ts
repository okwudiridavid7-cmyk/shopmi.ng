import { Router } from "express";
import path from "path";
import fs from "fs";
import multer from "multer";
import { z } from "zod";
import type { Prisma, UserRole } from "@prisma/client";
import { prisma } from "../db/prisma";
import { env } from "../config/env";
import { requireAuth, requireRoles } from "../auth/middleware";
import { decimalToNumber, toTenantPublic, toUserPublic } from "../lib/serialize";
import {
  deleteContactInquiryById,
  deleteContactInquiriesByEmail,
  toContactInquiryAdmin,
} from "../services/contactRetention";

/**
 * All routes on this router require authenticated super_admin.
 * Do not weaken this — UI-only checks are not enough for suspend/role changes.
 */
export const adminRouter = Router();

adminRouter.use(requireAuth, requireRoles("super_admin"));

fs.mkdirSync(env.uploadsDir, { recursive: true });

const upload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, env.uploadsDir),
    filename: (_req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase() || ".png";
      cb(null, `platform-${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`);
    },
  }),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (!["image/jpeg", "image/png", "image/webp", "image/gif", "image/svg+xml"].includes(file.mimetype)) {
      return cb(new Error("Only JPEG, PNG, WebP, GIF, SVG allowed"));
    }
    cb(null, true);
  },
});

adminRouter.post("/uploads", (req, res, next) => {
  upload.single("file")(req, res, (err) => {
    if (err) return res.status(400).json({ error: err.message || "Upload failed" });
    if (!req.file) return res.status(400).json({ error: "file is required" });
    const url = `${env.apiUrl}/uploads/${req.file.filename}`;
    return res.status(201).json({ url, path: `/uploads/${req.file.filename}` });
  });
});

type Period = "today" | "week" | "month";

function periodStart(period: Period): Date {
  const since = new Date();
  if (period === "today") {
    since.setHours(0, 0, 0, 0);
    return since;
  }
  if (period === "week") {
    since.setDate(since.getDate() - 7);
    return since;
  }
  since.setDate(since.getDate() - 30);
  return since;
}

function periodBounds(
  period: Period,
  day?: string
): { since: Date; until?: Date } {
  if (day && /^\d{4}-\d{2}-\d{2}$/.test(day)) {
    const since = new Date(`${day}T00:00:00.000`);
    const until = new Date(`${day}T23:59:59.999`);
    return { since, until };
  }
  return { since: periodStart(period) };
}

adminRouter.get("/overview", async (req, res, next) => {
  try {
    const raw = String(req.query.period ?? "month");
    const period: Period =
      raw === "today" || raw === "week" || raw === "month" ? raw : "month";
    const day = String(req.query.day ?? "").trim() || undefined;
    const { since, until } = periodBounds(period, day);
    const createdAt = until
      ? { gte: since, lte: until }
      : { gte: since };

    const [
      tenantCount,
      pendingVerifications,
      orderCountAll,
      paidInPeriod,
      buyerCount,
      sellerCount,
      productCount,
      recentShops,
      tenantsInPeriod,
    ] = await Promise.all([
      prisma.tenant.count(),
      prisma.verificationRequest.count({ where: { status: "pending" } }),
      prisma.order.count(),
      prisma.order.findMany({
        where: {
          status: { in: ["paid", "fulfilled"] },
          createdAt,
        },
        select: { total: true, currency: true },
      }),
      prisma.user.count({ where: { role: "buyer" } }),
      prisma.user.count({
        where: { role: { in: ["seller", "tenant_admin"] } },
      }),
      prisma.product.count(),
      prisma.tenant.findMany({
        take: 8,
        orderBy: { createdAt: "desc" },
        include: {
          owner: { select: { id: true, email: true, name: true } },
          plan: { select: { id: true, name: true, slug: true } },
        },
      }),
      prisma.tenant.findMany({
        where: { createdAt },
        select: { createdAt: true },
        orderBy: { createdAt: "asc" },
      }),
    ]);

    const gmv = paidInPeriod.reduce((s, o) => s + decimalToNumber(o.total), 0);
    const currency = paidInPeriod[0]?.currency ?? "NGN";

    const signupMap = new Map<string, number>();
    for (const t of tenantsInPeriod) {
      const date = t.createdAt.toISOString().slice(0, 10);
      signupMap.set(date, (signupMap.get(date) ?? 0) + 1);
    }
    const signupsOverTime = Array.from(signupMap.entries()).map(
      ([date, count]) => ({ date, count })
    );

    return res.json({
      overview: {
        period: day ? "today" : period,
        day: day ?? null,
        tenantCount,
        pendingVerifications,
        orderCount: orderCountAll,
        paidOrderCount: paidInPeriod.length,
        salesTotal: gmv,
        gmv,
        currency,
        userCount: buyerCount + sellerCount,
        buyerCount,
        sellerCount,
        productCount,
        signupsOverTime,
        recentShops: recentShops.map((t) => ({
          id: t.id,
          name: t.name,
          slug: t.slug,
          status: t.status,
          verifiedBadge: t.verifiedBadge,
          createdAt: t.createdAt.toISOString(),
          ownerEmail: t.owner.email,
          planName: t.plan?.name ?? null,
        })),
      },
    });
  } catch (err) {
    return next(err);
  }
});

adminRouter.get("/tenants", async (req, res, next) => {
  try {
    const q = String(req.query.q ?? "").trim().toLowerCase();
    const status = String(req.query.status ?? "").trim();

    const where: Prisma.TenantWhereInput = {};
    if (
      status === "pending_verification" ||
      status === "active" ||
      status === "suspended"
    ) {
      where.status = status;
    }
    if (q) {
      where.OR = [
        { name: { contains: q } },
        { slug: { contains: q } },
        { owner: { email: { contains: q } } },
      ];
    }

    const tenants = await prisma.tenant.findMany({
      where,
      include: {
        plan: true,
        owner: { select: { id: true, email: true, name: true, phone: true } },
        _count: { select: { products: true, orders: true } },
      },
      orderBy: { createdAt: "desc" },
    });
    return res.json({
      tenants: tenants.map((t) => ({
        ...toTenantPublic(t),
        plan: t.plan
          ? {
              id: t.plan.id,
              name: t.plan.name,
              slug: t.plan.slug,
              productLimit: t.plan.productLimit,
            }
          : null,
        ownerEmail: t.owner.email,
        ownerName: t.owner.name,
        ownerPhone: t.owner.phone,
        productCount: t._count.products,
        orderCount: t._count.orders,
      })),
    });
  } catch (err) {
    return next(err);
  }
});

adminRouter.get("/tenants/:id", async (req, res, next) => {
  try {
    const tenant = await prisma.tenant.findUnique({
      where: { id: req.params.id },
      include: {
        plan: true,
        owner: true,
        _count: { select: { products: true, orders: true } },
        verificationRequests: {
          orderBy: { createdAt: "desc" },
          take: 10,
        },
        orders: {
          orderBy: { createdAt: "desc" },
          take: 10,
          include: {
            buyer: { select: { id: true, email: true, name: true } },
          },
        },
      },
    });
    if (!tenant) {
      return res.status(404).json({ error: "Shop not found" });
    }

    const paidOrders = await prisma.order.findMany({
      where: {
        tenantId: tenant.id,
        status: { in: ["paid", "fulfilled"] },
      },
      select: { total: true, currency: true },
    });
    const salesTotal = paidOrders.reduce(
      (s, o) => s + decimalToNumber(o.total),
      0
    );

    return res.json({
      tenant: {
        ...toTenantPublic(tenant),
        plan: tenant.plan
          ? {
              id: tenant.plan.id,
              name: tenant.plan.name,
              slug: tenant.plan.slug,
              productLimit: tenant.plan.productLimit,
            }
          : null,
        owner: toUserPublic(tenant.owner),
        productCount: tenant._count.products,
        orderCount: tenant._count.orders,
        salesTotal,
        currency: paidOrders[0]?.currency ?? "NGN",
        recentOrders: tenant.orders.map((o) => ({
          id: o.id,
          status: o.status,
          total: decimalToNumber(o.total),
          currency: o.currency,
          createdAt: o.createdAt.toISOString(),
          buyerEmail: o.buyer.email,
          buyerName: o.buyer.name,
        })),
        verificationRequests: tenant.verificationRequests.map((r) => ({
          id: r.id,
          status: r.status,
          submittedDocs: Array.isArray(r.submittedDocs)
            ? (r.submittedDocs as { name: string; url: string }[])
            : [],
          note: r.note,
          createdAt: r.createdAt.toISOString(),
          reviewedAt: r.reviewedAt?.toISOString() ?? null,
        })),
      },
    });
  } catch (err) {
    return next(err);
  }
});

adminRouter.patch("/tenants/:id", async (req, res, next) => {
  try {
    const body = z
      .object({
        status: z.enum(["pending_verification", "active", "suspended"]).optional(),
        verifiedBadge: z.boolean().optional(),
      })
      .parse(req.body);

    if (body.status === undefined && body.verifiedBadge === undefined) {
      return res.status(400).json({ error: "No changes provided" });
    }

    const existing = await prisma.tenant.findUnique({
      where: { id: req.params.id },
    });
    if (!existing) {
      return res.status(404).json({ error: "Shop not found" });
    }

    const tenant = await prisma.tenant.update({
      where: { id: existing.id },
      data: {
        ...(body.status != null ? { status: body.status } : {}),
        ...(body.verifiedBadge != null
          ? { verifiedBadge: body.verifiedBadge }
          : {}),
      },
      include: {
        plan: true,
        owner: { select: { id: true, email: true, name: true } },
        _count: { select: { products: true, orders: true } },
      },
    });

    if (body.verifiedBadge === true && !existing.verifiedBadge) {
      try {
        const { ensurePaystackSubaccount } = await import(
          "../services/paystackSubaccount"
        );
        await ensurePaystackSubaccount(tenant.id);
      } catch (subErr) {
        console.warn("[paystack] subaccount on admin verify failed", subErr);
      }
      try {
        const { sendVerificationApprovedEmail } = await import(
          "../services/verificationEmail"
        );
        await sendVerificationApprovedEmail({
          to: tenant.owner.email,
          shopName: tenant.name,
          name: tenant.owner.name,
        });
      } catch (emailErr) {
        console.warn("[email] admin verification approved failed", emailErr);
      }
    }

    return res.json({
      tenant: {
        ...toTenantPublic(tenant),
        plan: tenant.plan
          ? {
              id: tenant.plan.id,
              name: tenant.plan.name,
              slug: tenant.plan.slug,
              productLimit: tenant.plan.productLimit,
            }
          : null,
        ownerEmail: tenant.owner.email,
        ownerName: tenant.owner.name,
        productCount: tenant._count.products,
        orderCount: tenant._count.orders,
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

adminRouter.get("/users", async (req, res, next) => {
  try {
    const role = String(req.query.role ?? "").trim();
    const q = String(req.query.q ?? "").trim().toLowerCase();

    const where: Prisma.UserWhereInput = {};
    if (
      role === "buyer" ||
      role === "seller" ||
      role === "tenant_admin" ||
      role === "super_admin"
    ) {
      where.role = role;
    }
    if (q) {
      where.OR = [
        { email: { contains: q } },
        { name: { contains: q } },
      ];
    }

    const users = await prisma.user.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 200,
    });

    return res.json({
      users: users.map((u) => ({
        ...toUserPublic(u),
        signupMethod: u.googleId ? "google" : "email",
      })),
    });
  } catch (err) {
    return next(err);
  }
});

adminRouter.patch("/users/:id/role", async (req, res, next) => {
  try {
    const body = z
      .object({
        role: z.enum(["buyer", "seller", "tenant_admin", "super_admin"]),
      })
      .parse(req.body);

    const existing = await prisma.user.findUnique({
      where: { id: req.params.id },
    });
    if (!existing) {
      return res.status(404).json({ error: "User not found" });
    }

    // Prevent locking yourself out of the last super_admin
    if (
      existing.role === "super_admin" &&
      body.role !== "super_admin" &&
      existing.id === req.user!.id
    ) {
      const otherAdmins = await prisma.user.count({
        where: { role: "super_admin", NOT: { id: existing.id } },
      });
      if (otherAdmins === 0) {
        return res.status(400).json({
          error: "Cannot demote the only super admin account",
        });
      }
    }

    const user = await prisma.user.update({
      where: { id: existing.id },
      data: { role: body.role as UserRole },
    });

    return res.json({
      user: {
        ...toUserPublic(user),
        signupMethod: user.googleId ? "google" : "email",
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

const planSchema = z.object({
  name: z.string().min(2).max(80),
  slug: z
    .string()
    .min(2)
    .max(40)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  price: z.coerce.number().min(0),
  currency: z.string().length(3).default("NGN"),
  productLimit: z.coerce.number().int().positive().nullable().optional(),
  featureFlags: z.record(z.unknown()).optional(),
  trialDays: z.coerce.number().int().min(0).default(3),
  active: z.boolean().optional(),
});

function serializePlan(p: {
  id: string;
  name: string;
  slug: string;
  price: { toString(): string } | number;
  currency: string;
  productLimit: number | null;
  featureFlags: unknown;
  trialDays: number;
  active: boolean;
  createdAt?: Date;
}) {
  return {
    id: p.id,
    name: p.name,
    slug: p.slug,
    price: decimalToNumber(p.price),
    currency: p.currency,
    productLimit: p.productLimit,
    featureFlags: (p.featureFlags as Record<string, unknown>) ?? {},
    trialDays: p.trialDays,
    active: p.active,
    ...(p.createdAt
      ? { createdAt: p.createdAt.toISOString() }
      : {}),
  };
}

adminRouter.get("/plans", async (_req, res, next) => {
  try {
    const plans = await prisma.plan.findMany({ orderBy: { price: "asc" } });
    return res.json({ plans: plans.map(serializePlan) });
  } catch (err) {
    return next(err);
  }
});

adminRouter.post("/plans", async (req, res, next) => {
  try {
    const body = planSchema.parse(req.body);
    const plan = await prisma.plan.create({
      data: {
        name: body.name,
        slug: body.slug,
        price: body.price,
        currency: body.currency,
        productLimit: body.productLimit ?? null,
        featureFlags: (body.featureFlags ?? {}) as Prisma.InputJsonValue,
        trialDays: body.trialDays,
        active: body.active ?? true,
      },
    });
    return res.status(201).json({ plan: serializePlan(plan) });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res
        .status(400)
        .json({ error: "Validation failed", details: err.flatten() });
    }
    return next(err);
  }
});

adminRouter.patch("/plans/:id", async (req, res, next) => {
  try {
    const body = planSchema.partial().parse(req.body);
    const plan = await prisma.plan.update({
      where: { id: req.params.id },
      data: {
        ...(body.name != null ? { name: body.name } : {}),
        ...(body.slug != null ? { slug: body.slug } : {}),
        ...(body.price != null ? { price: body.price } : {}),
        ...(body.currency != null ? { currency: body.currency } : {}),
        ...(body.productLimit !== undefined
          ? { productLimit: body.productLimit }
          : {}),
        ...(body.featureFlags != null
          ? { featureFlags: body.featureFlags as Prisma.InputJsonValue }
          : {}),
        ...(body.trialDays != null ? { trialDays: body.trialDays } : {}),
        ...(body.active != null ? { active: body.active } : {}),
      },
    });
    return res.json({ plan: serializePlan(plan) });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res
        .status(400)
        .json({ error: "Validation failed", details: err.flatten() });
    }
    return next(err);
  }
});

adminRouter.delete("/plans/:id", async (req, res, next) => {
  try {
    const inUse = await prisma.tenant.count({
      where: { planId: req.params.id },
    });
    if (inUse > 0) {
      return res.status(409).json({
        error: `Plan is assigned to ${inUse} shop(s). Reassign them before deleting.`,
      });
    }
    await prisma.plan.delete({ where: { id: req.params.id } });
    return res.json({ ok: true });
  } catch (err) {
    return next(err);
  }
});

/** List / search contact inquiries (REM-16 DSAR support). */
adminRouter.get("/contact-inquiries", async (req, res, next) => {
  try {
    const email = String(req.query.email ?? "")
      .trim()
      .toLowerCase();
    const q = String(req.query.q ?? "").trim();
    const limit = Math.min(
      100,
      Math.max(1, Number(req.query.limit ?? 50) || 50)
    );

    const where: Prisma.ContactInquiryWhereInput = {};
    if (email) {
      where.email = email;
    } else if (q) {
      where.OR = [
        { email: { contains: q } },
        { name: { contains: q } },
        { subject: { contains: q } },
      ];
    }

    const rows = await prisma.contactInquiry.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: limit,
    });

    return res.json({
      inquiries: rows.map(toContactInquiryAdmin),
    });
  } catch (err) {
    return next(err);
  }
});

adminRouter.get("/contact-inquiries/:id", async (req, res, next) => {
  try {
    const row = await prisma.contactInquiry.findUnique({
      where: { id: req.params.id },
    });
    if (!row) {
      return res.status(404).json({ error: "Inquiry not found" });
    }
    return res.json({ inquiry: toContactInquiryAdmin(row) });
  } catch (err) {
    return next(err);
  }
});

adminRouter.delete("/contact-inquiries/:id", async (req, res, next) => {
  try {
    const result = await deleteContactInquiryById(
      req.params.id,
      req.user!.id
    );
    if (!result.deleted) {
      return res.status(404).json({ error: "Inquiry not found" });
    }
    return res.json({ ok: true, logId: result.logId });
  } catch (err) {
    return next(err);
  }
});

/** DSAR: delete all inquiries for an email address. */
adminRouter.delete("/contact-inquiries", async (req, res, next) => {
  try {
    const email = String(req.query.email ?? req.body?.email ?? "")
      .trim()
      .toLowerCase();
    if (!email || !z.string().email().safeParse(email).success) {
      return res.status(400).json({
        error: "A valid email query/body parameter is required.",
        code: "INVALID_EMAIL",
      });
    }
    const result = await deleteContactInquiriesByEmail(email, req.user!.id);
    return res.json({
      ok: true,
      deletedCount: result.deletedCount,
      logId: result.logId,
    });
  } catch (err) {
    return next(err);
  }
});
