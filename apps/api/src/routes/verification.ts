import path from "path";
import fs from "fs";
import { Router } from "express";
import multer from "multer";
import { z } from "zod";
import type { VerificationRequest } from "@prisma/client";
import type { VerificationRequestPublic } from "@vendors/shared-types";
import { prisma } from "../db/prisma";
import { env } from "../config/env";
import { requireAuth, requireRoles } from "../auth/middleware";
import {
  requireTenantFromMembership,
  requireTenantRoles,
} from "../tenant/middleware";
import { tenantWhere } from "../tenant/tenantContext";

const verificationDir = path.join(env.uploadsDir, "verification");
fs.mkdirSync(verificationDir, { recursive: true });

const upload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, verificationDir),
    filename: (_req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase() || ".pdf";
      cb(null, `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`);
    },
  }),
  limits: { fileSize: 8 * 1024 * 1024, files: 5 },
  fileFilter: (_req, file, cb) => {
    const ok = [
      "image/jpeg",
      "image/png",
      "image/webp",
      "application/pdf",
    ].includes(file.mimetype);
    if (!ok) return cb(new Error("Only JPEG, PNG, WebP, or PDF allowed"));
    return cb(null, true);
  },
});

function toVerificationPublic(
  row: VerificationRequest & {
    tenant?: { id: string; name: string; slug: string; verifiedBadge: boolean } | null;
  }
): VerificationRequestPublic {
  const docs = Array.isArray(row.submittedDocs)
    ? (row.submittedDocs as { name: string; url: string }[])
    : [];
  return {
    id: row.id,
    tenantId: row.tenantId,
    status: row.status,
    submittedDocs: docs,
    reviewedById: row.reviewedById,
    reviewedAt: row.reviewedAt?.toISOString() ?? null,
    note: row.note,
    createdAt: row.createdAt.toISOString(),
    tenant: row.tenant
      ? {
          id: row.tenant.id,
          name: row.tenant.name,
          slug: row.tenant.slug,
          verifiedBadge: row.tenant.verifiedBadge,
        }
      : null,
  };
}

export const sellerVerificationRouter = Router();

sellerVerificationRouter.use(requireAuth, requireTenantFromMembership());

sellerVerificationRouter.get("/", async (req, res, next) => {
  try {
    const latest = await prisma.verificationRequest.findFirst({
      where: tenantWhere(req.tenant!),
      orderBy: { createdAt: "desc" },
      include: {
        tenant: {
          select: { id: true, name: true, slug: true, verifiedBadge: true },
        },
      },
    });
    const tenant = await prisma.tenant.findUnique({
      where: { id: req.tenant!.tenantId },
      select: { verifiedBadge: true, status: true },
    });
    return res.json({
      verifiedBadge: tenant?.verifiedBadge ?? false,
      tenantStatus: tenant?.status,
      request: latest ? toVerificationPublic(latest) : null,
    });
  } catch (err) {
    return next(err);
  }
});

sellerVerificationRouter.post(
  "/",
  requireTenantRoles("owner", "manager"),
  (req, res, next) => {
  upload.array("docs", 5)(req, res, async (err) => {
    if (err) {
      return res.status(400).json({ error: err.message || "Upload failed" });
    }
    try {
      const pending = await prisma.verificationRequest.findFirst({
        where: tenantWhere(req.tenant!, { status: "pending" as const }),
      });
      if (pending) {
        return res.status(409).json({
          error: "A pending verification request already exists",
        });
      }

      const files = (req.files as Express.Multer.File[] | undefined) ?? [];
      if (files.length === 0) {
        return res.status(400).json({ error: "At least one document is required" });
      }

      const submittedDocs = files.map((f) => ({
        name: f.originalname,
        url: `${env.apiUrl}/uploads/verification/${f.filename}`,
      }));

      const created = await prisma.verificationRequest.create({
        data: {
          tenantId: req.tenant!.tenantId,
          status: "pending",
          submittedDocs,
        },
        include: {
          tenant: {
            select: { id: true, name: true, slug: true, verifiedBadge: true },
          },
        },
      });

      return res.status(201).json({ request: toVerificationPublic(created) });
    } catch (e) {
      return next(e);
    }
  });
});

export const adminVerificationRouter = Router();

adminVerificationRouter.use(requireAuth, requireRoles("super_admin"));

adminVerificationRouter.get("/", async (req, res, next) => {
  try {
    const status = String(req.query.status ?? "").trim();
    const where =
      status === "pending" || status === "approved" || status === "rejected"
        ? { status: status as "pending" | "approved" | "rejected" }
        : {};
    const requests = await prisma.verificationRequest.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: {
        tenant: {
          select: { id: true, name: true, slug: true, verifiedBadge: true },
        },
      },
      take: 100,
    });
    return res.json({ requests: requests.map(toVerificationPublic) });
  } catch (err) {
    return next(err);
  }
});

const reviewSchema = z
  .object({
    decision: z.enum(["approve", "reject"]),
    note: z.string().max(2000).optional(),
  })
  .superRefine((val, ctx) => {
    if (val.decision === "reject" && !val.note?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "A reason is required when rejecting",
        path: ["note"],
      });
    }
  });

adminVerificationRouter.post("/:id/review", async (req, res, next) => {
  try {
    const body = reviewSchema.parse(req.body);
    const existing = await prisma.verificationRequest.findUnique({
      where: { id: req.params.id },
      include: {
        tenant: { include: { owner: true } },
      },
    });
    if (!existing) {
      return res.status(404).json({ error: "Request not found" });
    }
    if (existing.status !== "pending") {
      return res.status(409).json({ error: "Request already reviewed" });
    }

    const updated = await prisma.$transaction(async (tx) => {
      const request = await tx.verificationRequest.update({
        where: { id: existing.id },
        data: {
          status: body.decision === "approve" ? "approved" : "rejected",
          reviewedById: req.user!.id,
          reviewedAt: new Date(),
          note: body.note ?? null,
        },
        include: {
          tenant: {
            select: { id: true, name: true, slug: true, verifiedBadge: true },
          },
        },
      });

      if (body.decision === "approve") {
        await tx.tenant.update({
          where: { id: existing.tenantId },
          data: { verifiedBadge: true, status: "active" },
        });
        request.tenant = {
          ...request.tenant!,
          verifiedBadge: true,
        };
      }

      return request;
    });

    if (body.decision === "approve") {
      try {
        const { ensurePaystackSubaccount } = await import(
          "../services/paystackSubaccount"
        );
        await ensurePaystackSubaccount(existing.tenantId);
      } catch (subErr) {
        console.warn("[paystack] subaccount on verify failed", subErr);
      }
      try {
        const { sendVerificationApprovedEmail } = await import(
          "../services/verificationEmail"
        );
        await sendVerificationApprovedEmail({
          to: existing.tenant.owner.email,
          shopName: existing.tenant.name,
          name: existing.tenant.owner.name,
        });
      } catch (emailErr) {
        console.warn("[email] verification approved failed", emailErr);
      }
    }

    if (body.decision === "reject") {
      const { sendVerificationRejectedEmail } = await import(
        "../services/verificationEmail"
      );
      try {
        await sendVerificationRejectedEmail({
          to: existing.tenant.owner.email,
          shopName: existing.tenant.name,
          reason: body.note!.trim(),
          name: existing.tenant.owner.name,
        });
      } catch (emailErr) {
        console.warn("[email] verification rejection failed", emailErr);
      }
    }

    return res.json({ request: toVerificationPublic(updated) });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: "Validation failed", details: err.flatten() });
    }
    return next(err);
  }
});
