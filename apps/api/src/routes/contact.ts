import { Router } from "express";
import { z } from "zod";
import { prisma } from "../db/prisma";
import { env } from "../config/env";
import { getPlatformSetting } from "../lib/platformSettings";
import { escapeHtml } from "../lib/htmlEscape";
import {
  HeaderInjectionError,
  sanitizeEmailSubject,
  sanitizeHeaderFragment,
} from "../lib/sanitizeHeader";
import {
  InvalidPhoneError,
  normalizeContactPhone,
} from "../lib/contactPhone";
import {
  platformContactIpLimiter,
  shopContactGlobalLimiter,
  shopContactIpLimiter,
} from "../lib/contactRateLimit";
import {
  isShopContactFormEnabled,
  resolveShopContactRecipient,
} from "../lib/shopContact";
import {
  contactEmailInner,
  submitContactInquiry,
} from "../services/contactInquiry";
import { confirmShopContactInquiry } from "../services/contactConfirm";
import { CaptchaError, verifyTurnstileToken } from "../lib/turnstile";
import {
  logContactEvent,
  newContactRequestId,
} from "../lib/contactLog";

export const contactRouter = Router();

const bodySchema = z.object({
  name: z.string().min(2).max(120),
  email: z.string().email(),
  phone: z.string().max(40).optional(),
  subject: z.string().min(3).max(160),
  message: z.string().min(10).max(5000),
  /** Honeypot — must stay empty (REM-08 lite). */
  website: z.string().max(200).optional(),
  /** Cloudflare Turnstile token (REM-14). */
  captchaToken: z.string().max(4096).optional(),
});

const idempotencyKeySchema = z
  .string()
  .trim()
  .min(8)
  .max(128)
  .regex(/^[A-Za-z0-9._:-]+$/);

function parseContactBody(raw: unknown) {
  const body = bodySchema.parse(raw);
  const subject = sanitizeEmailSubject(body.subject);
  const phone = normalizeContactPhone(body.phone);
  return { ...body, subject, phone };
}

class InvalidIdempotencyKeyError extends Error {
  readonly code = "INVALID_IDEMPOTENCY_KEY" as const;
  constructor() {
    super("Invalid Idempotency-Key header.");
    this.name = "InvalidIdempotencyKeyError";
  }
}

function readIdempotencyKey(header: string | undefined): string | null {
  if (!header?.trim()) return null;
  const parsed = idempotencyKeySchema.safeParse(header);
  if (!parsed.success) throw new InvalidIdempotencyKeyError();
  return parsed.data;
}

function zodOrHeaderError(
  err: unknown,
  res: import("express").Response
): boolean {
  if (err instanceof HeaderInjectionError) {
    res.status(400).json({
      error: err.message,
      code: "INVALID_SUBJECT",
    });
    return true;
  }
  if (err instanceof InvalidPhoneError) {
    res.status(400).json({
      error: err.message,
      code: err.code,
    });
    return true;
  }
  if (err instanceof InvalidIdempotencyKeyError) {
    res.status(400).json({
      error: err.message,
      code: err.code,
    });
    return true;
  }
  if (err instanceof CaptchaError) {
    const status = err.code === "CAPTCHA_UNAVAILABLE" ? 503 : 400;
    res.status(status).json({
      error: err.message,
      code: err.code,
    });
    return true;
  }
  if (err instanceof z.ZodError) {
    res.status(400).json({ error: "Please complete every required field." });
    return true;
  }
  return false;
}

function clientMeta(req: import("express").Request) {
  return {
    ip: req.ip || req.socket.remoteAddress || null,
    userAgent: req.get("user-agent") || null,
  };
}

function sendSubmitResult(
  res: import("express").Response,
  result: Awaited<ReturnType<typeof submitContactInquiry>>,
  ctx: {
    requestId: string;
    route: "platform" | "shop";
    slug?: string | null;
    started: number;
  }
) {
  const latencyMs = Date.now() - ctx.started;
  if (result.ok) {
    const outcome =
      result.status === "awaiting_confirm"
        ? "awaiting_confirm"
        : result.status === "queued"
          ? "queued"
          : "sent";
    logContactEvent({
      requestId: ctx.requestId,
      route: ctx.route,
      slug: ctx.slug,
      inquiryId: result.id,
      outcome,
      latencyMs,
      replay: result.replay,
    });
    const body = { ok: true as const, id: result.id, status: result.status };
    if (result.status === "queued" || result.status === "awaiting_confirm") {
      return res.status(202).json(body);
    }
    return res.json(body);
  }
  logContactEvent({
    requestId: ctx.requestId,
    route: ctx.route,
    slug: ctx.slug,
    inquiryId: result.id,
    outcome: "failed",
    latencyMs,
    code: result.code,
    replay: result.replay,
  });
  return res.status(503).json({
    ok: false,
    id: result.id,
    error:
      result.code === "MAIL_UNAVAILABLE"
        ? "Email delivery is temporarily unavailable. Please try again later."
        : "We couldn’t deliver your message. Please try again later.",
    code: result.code,
  });
}

function isHoneypotTriggered(website: string | undefined): boolean {
  return Boolean(website && website.trim().length > 0);
}

contactRouter.post("/", platformContactIpLimiter, async (req, res, next) => {
  const requestId = newContactRequestId();
  const started = Date.now();
  try {
    const body = parseContactBody(req.body);
    if (isHoneypotTriggered(body.website)) {
      logContactEvent({
        requestId,
        route: "platform",
        outcome: "honeypot",
        latencyMs: Date.now() - started,
      });
      return res.json({ ok: true });
    }

    const meta = clientMeta(req);
    try {
      await verifyTurnstileToken(body.captchaToken, meta.ip);
    } catch (err) {
      if (err instanceof CaptchaError) {
        logContactEvent({
          requestId,
          route: "platform",
          outcome: "captcha_failed",
          latencyMs: Date.now() - started,
          code: err.code,
        });
      }
      throw err;
    }

    const idempotencyKey = readIdempotencyKey(
      req.get("idempotency-key") ?? undefined
    );
    const to = await getPlatformSetting(
      "support_email",
      "support@shopmi.ng"
    );
    const appName = await getPlatformSetting("app_name", env.appName);

    const result = await submitContactInquiry({
      scope: "platform",
      to,
      body,
      idempotencyKey,
      ...meta,
      emailInnerHtml: contactEmailInner({
        headingHtml: `<p>New message from the contact form.</p>`,
        body,
      }),
      emailSubjectPrefix: `[${sanitizeHeaderFragment(appName)} contact]`,
    });

    return sendSubmitResult(res, result, {
      requestId,
      route: "platform",
      started,
    });
  } catch (err) {
    if (zodOrHeaderError(err, res)) {
      if (!(err instanceof CaptchaError)) {
        logContactEvent({
          requestId,
          route: "platform",
          outcome: "rejected",
          latencyMs: Date.now() - started,
          code:
            err instanceof HeaderInjectionError
              ? err.code
              : err instanceof InvalidPhoneError
                ? err.code
                : err instanceof InvalidIdempotencyKeyError
                  ? err.code
                  : "VALIDATION",
        });
      }
      return;
    }
    return next(err);
  }
});

contactRouter.post(
  "/shops/:slug",
  shopContactIpLimiter,
  shopContactGlobalLimiter,
  async (req, res, next) => {
    const requestId = newContactRequestId();
    const started = Date.now();
    const slugParam = String(req.params.slug || "").toLowerCase();
    try {
      const body = parseContactBody(req.body);
      if (isHoneypotTriggered(body.website)) {
        logContactEvent({
          requestId,
          route: "shop",
          slug: slugParam,
          outcome: "honeypot",
          latencyMs: Date.now() - started,
        });
        return res.json({ ok: true });
      }

      const meta = clientMeta(req);
      try {
        await verifyTurnstileToken(body.captchaToken, meta.ip);
      } catch (err) {
        if (err instanceof CaptchaError) {
          logContactEvent({
            requestId,
            route: "shop",
            slug: slugParam,
            outcome: "captcha_failed",
            latencyMs: Date.now() - started,
            code: err.code,
          });
        }
        throw err;
      }

      const idempotencyKey = readIdempotencyKey(
        req.get("idempotency-key") ?? undefined
      );
      const tenant = await prisma.tenant.findUnique({
        where: { slug: slugParam },
      });
      if (!tenant) {
        logContactEvent({
          requestId,
          route: "shop",
          slug: slugParam,
          outcome: "rejected",
          latencyMs: Date.now() - started,
          code: "NOT_FOUND",
        });
        return res.status(404).json({ error: "Shop not found" });
      }

      const theme =
        tenant.themeSettings && typeof tenant.themeSettings === "object"
          ? (tenant.themeSettings as Record<string, unknown>)
          : {};

      if (!isShopContactFormEnabled(theme)) {
        logContactEvent({
          requestId,
          route: "shop",
          slug: tenant.slug,
          outcome: "rejected",
          latencyMs: Date.now() - started,
          code: "CONTACT_DISABLED",
        });
        return res.status(422).json({
          error: "This shop is not accepting contact form messages.",
          code: "CONTACT_DISABLED",
        });
      }

      const to = resolveShopContactRecipient({
        tenantEmail: tenant.email,
        theme,
      });
      if (!to) {
        logContactEvent({
          requestId,
          route: "shop",
          slug: tenant.slug,
          outcome: "rejected",
          latencyMs: Date.now() - started,
          code: "NO_RECIPIENT",
        });
        return res.status(422).json({
          error:
            "This shop has not configured a contact email yet. Please try another channel.",
          code: "NO_RECIPIENT",
        });
      }

      const result = await submitContactInquiry({
        scope: "shop",
        tenantId: tenant.id,
        slug: tenant.slug,
        to,
        body,
        idempotencyKey,
        ...meta,
        emailInnerHtml: contactEmailInner({
          headingHtml: `<p>New message for <strong>${escapeHtml(tenant.name)}</strong>.</p>`,
          body,
        }),
        emailSubjectPrefix: `[${sanitizeHeaderFragment(tenant.name)}]`,
        requireSenderConfirm: env.shopContactConfirmRequired,
        shopName: tenant.name,
      });

      return sendSubmitResult(res, result, {
        requestId,
        route: "shop",
        slug: tenant.slug,
        started,
      });
    } catch (err) {
      if (zodOrHeaderError(err, res)) {
        if (!(err instanceof CaptchaError)) {
          logContactEvent({
            requestId,
            route: "shop",
            slug: slugParam,
            outcome: "rejected",
            latencyMs: Date.now() - started,
            code:
              err instanceof HeaderInjectionError
                ? err.code
                : err instanceof InvalidPhoneError
                  ? err.code
                  : err instanceof InvalidIdempotencyKeyError
                    ? err.code
                    : "VALIDATION",
          });
        }
        return;
      }
      return next(err);
    }
  }
);

/** Confirm shop contact after magic-link click (REM-17). */
contactRouter.post("/confirm", platformContactIpLimiter, async (req, res, next) => {
  const requestId = newContactRequestId();
  const started = Date.now();
  try {
    const token = String(req.body?.token ?? "").trim();
    const result = await confirmShopContactInquiry(token);
    if (!result.ok) {
      const status =
        result.code === "EXPIRED" || result.code === "INVALID_TOKEN"
          ? 400
          : result.code === "NO_RECIPIENT"
            ? 422
            : 503;
      logContactEvent({
        requestId,
        route: "shop",
        inquiryId: result.id,
        outcome: "rejected",
        latencyMs: Date.now() - started,
        code: result.code,
      });
      return res.status(status).json({
        ok: false,
        error: result.error,
        code: result.code,
        id: result.id,
      });
    }
    logContactEvent({
      requestId,
      route: "shop",
      inquiryId: result.id,
      outcome: "confirmed",
      latencyMs: Date.now() - started,
      replay: result.replay,
    });
    return res.status(result.replay ? 200 : 202).json({
      ok: true,
      id: result.id,
      status: result.status,
    });
  } catch (err) {
    return next(err);
  }
});
