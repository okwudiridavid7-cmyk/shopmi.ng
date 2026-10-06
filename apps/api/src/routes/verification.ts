import { Router } from "express";
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
import { ImageRejectedError, normalizeImage } from "../services/images";
import { newKey, putObject } from "../lib/storage";
import {
  displayFilename,
  memoryUpload,
  receiveArray,
  sendPrivateObject,
  UploadError,
} from "../lib/uploads";
import { redisRateLimit } from "../lib/rateLimit";

const upload = memoryUpload(8 * 1024 * 1024, 5);
const submitLimiter = redisRateLimit({
  name: "verification-submit",
  windowMs: 60 * 60_000,
  max: 10,
  by: "tenant",
});

/** Stored shape. Legacy rows carry a public `url` instead of a private `key`. */
type StoredDoc = { name: string; key?: string; contentType?: string; url?: string };

function storedDocs(row: VerificationRequest): StoredDoc[] {
  return Array.isArray(row.submittedDocs) ? (row.submittedDocs as StoredDoc[]) : [];
}

const isPdf = (b: Buffer) => b.subarray(0, 5).toString("latin1") === "%PDF-";

/** PDFs are stored as-is (private, download-only); images are re-encoded. */
async function storeDocument(
  tenantId: string,
  file: Express.Multer.File
): Promise<StoredDoc> {
  const baseName = displayFilename(file.originalname.replace(/\.[^.]+$/, ""));
  if (isPdf(file.buffer)) {
    const key = newKey(`t/${tenantId}/verification`, "pdf");
    await putObject("private", key, file.buffer, "application/pdf");
    return { name: `${baseName}.pdf`, key, contentType: "application/pdf" };
  }
  const { buffer } = await normalizeImage(file.buffer, { maxSize: 2400 });
  const key = newKey(`t/${tenantId}/verification`, "webp");
  await putObject("private", key, buffer, "image/webp");
  return { name: `${baseName}.webp`, key, contentType: "image/webp" };
}

function toVerificationPublic(
  row: VerificationRequest & {
    tenant?: { id: string; name: string; slug: string; verifiedBadge: boolean } | null;
  },
  audience: "seller" | "admin"
): VerificationRequestPublic {
  const base =
    audience === "admin"
      ? `${env.apiUrl}/api/admin/verification-requests/${row.id}/docs`
      : `${env.apiUrl}/api/seller/verification/${row.id}/docs`;
  const docs = storedDocs(row).map((d, i) => ({
    name: d.name,
    url: d.key ? `${base}/${i}` : (d.url ?? ""),
  }));
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

async function sendDoc(
  res: import("express").Response,
  row: VerificationRequest | null,
  index: string
) {
  const doc = row ? storedDocs(row)[Number.parseInt(index, 10)] : undefined;
  if (!doc?.key || !doc.contentType) {
    return res.status(404).json({ error: "File not found" });
  }
  return sendPrivateObject(res, doc.key, { contentType: doc.contentType, filename: doc.name });
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
      request: latest ? toVerificationPublic(latest, "seller") : null,
    });
  } catch (err) {
    return next(err);
  }
});

sellerVerificationRouter.get("/:id/docs/:index", async (req, res, next) => {
  try {
    const row = await prisma.verificationRequest.findFirst({
      where: tenantWhere(req.tenant!, { id: req.params.id }),
    });
    return await sendDoc(res, row, req.params.index);
  } catch (err) {
    return next(err);
  }
});

sellerVerificationRouter.post(
  "/",
  requireTenantRoles("owner", "manager"),
  submitLimiter,
  async (req, res, next) => {
    try {
      const files = await receiveArray(upload, "docs", 5, req, res);
      if (files.length === 0) {
        return res.status(400).json({ error: "At least one document is required" });
      }
      const pending = await prisma.verificationRequest.findFirst({
        where: tenantWhere(req.tenant!, { status: "pending" as const }),
      });
      if (pending) {
        return res.status(409).json({
          error: "A pending verification request already exists",
        });
      }

      const submittedDocs: StoredDoc[] = [];
      for (const f of files) {
        submittedDocs.push(await storeDocument(req.tenant!.tenantId, f));
      }

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

      return res.status(201).json({ request: toVerificationPublic(created, "seller") });
    } catch (e) {
      if (e instanceof UploadError || e instanceof ImageRejectedError) {
        return res.status(400).json({
          error:
            e instanceof ImageRejectedError
              ? "Upload PDF, JPEG, PNG or WebP files only."
              : e.message,
        });
      }
      return next(e);
    }
  }
);

export const adminVerificationRouter = Router();

adminVerificationRouter.use(requireAuth, requireRoles("super_admin"));

adminVerificationRouter.get("/:id/docs/:index", async (req, res, next) => {
  try {
    const row = await prisma.verificationRequest.findUnique({ where: { id: req.params.id } });
    return await sendDoc(res, row, req.params.index);
  } catch (err) {
    return next(err);
  }
});

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
    return res.json({ requests: requests.map((r) => toVerificationPublic(r, "admin")) });
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

    return res.json({ request: toVerificationPublic(updated, "admin") });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: "Validation failed", details: err.flatten() });
    }
    return next(err);
  }
});
