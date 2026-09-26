import { Router } from "express";
import rateLimit from "express-rate-limit";
import { z } from "zod";
import crypto from "crypto";
import { OAuth2Client } from "google-auth-library";
import { prisma } from "../db/prisma";
import { env } from "../config/env";
import { toUserPublic } from "../lib/serialize";
import { hashPassword, verifyPassword } from "./password";
import {
  clearAuthCookies,
  REFRESH_COOKIE,
  setAuthCookies,
} from "./cookies";
import {
  issueRefreshToken,
  rotateRefreshToken,
  revokeRefreshToken,
  signAccessToken,
} from "./tokens";
import { requireAuth } from "./middleware";
import { mergeGuestCarts } from "../services/cartMerge";
import { CART_SESSION_COOKIE } from "../lib/cartSession";
import { enqueueTransactionalMail } from "../queue/transactionalMail";

async function mergeCartAfterAuth(
  req: import("express").Request,
  userId: string
) {
  const sessionId = req.cookies?.[CART_SESSION_COOKIE] as string | undefined;
  try {
    await mergeGuestCarts(userId, sessionId);
  } catch {
    // Non-fatal — guest cart can be merged later via POST /api/carts/merge
  }
}

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 50,
  standardHeaders: true,
  legacyHeaders: false,
});

const signupSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(128),
  name: z.string().trim().min(1).max(120),
  role: z.enum(["buyer", "seller"]).default("buyer"),
  phone: z.string().min(5).max(32).optional(),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

async function issueSession(
  user: { id: string; email: string; role: import("@prisma/client").UserRole },
  res: import("express").Response
) {
  const accessToken = signAccessToken({
    sub: user.id,
    email: user.email,
    role: user.role,
  });
  const refreshToken = await issueRefreshToken(user.id);
  setAuthCookies(res, accessToken, refreshToken);
}

export const authRouter = Router();

authRouter.use(authLimiter);

authRouter.post("/signup", async (req, res, next) => {
  try {
    const body = signupSchema.parse(req.body);
    const existing = await prisma.user.findUnique({
      where: { email: body.email.toLowerCase() },
    });
    if (existing) {
      return res.status(409).json({ error: "Email already registered" });
    }

    // Signup creates a users row only — tenants are created via POST /api/tenants.
    const verifyRaw = crypto.randomBytes(32).toString("hex");
    const verifyHash = crypto.createHash("sha256").update(verifyRaw).digest("hex");

    const user = await prisma.user.create({
      data: {
        email: body.email.toLowerCase(),
        passwordHash: await hashPassword(body.password),
        role: body.role,
        name: body.name,
        phone: body.phone,
        emailVerificationToken: verifyHash,
        emailVerificationExpires: new Date(Date.now() + 24 * 60 * 60 * 1000),
      },
    });

    await issueSession(user, res);
    await mergeCartAfterAuth(req, user.id);

    const dashboardUrl =
      body.role === "seller" ? `${env.webUrl}/onboarding` : `${env.webUrl}/explore`;
    const verifyUrl = `${env.webUrl}/verify-email?token=${verifyRaw}`;

    void enqueueTransactionalMail({
      kind: "welcome",
      to: user.email,
      data: {
        name: user.name,
        appName: env.appName,
        dashboardUrl,
      },
      idempotencyKey: `welcome:${user.id}`,
    }).catch((e) => console.warn("[auth] welcome mail enqueue failed", e));

    void enqueueTransactionalMail({
      kind: "verify_email",
      to: user.email,
      data: { name: user.name, verifyUrl },
      idempotencyKey: `verify:${user.id}:${verifyHash.slice(0, 12)}`,
    }).catch((e) => console.warn("[auth] verify mail enqueue failed", e));

    return res.status(201).json({ user: toUserPublic(user) });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: "Validation failed", details: err.flatten() });
    }
    return next(err);
  }
});

authRouter.post("/login", async (req, res, next) => {
  try {
    const body = loginSchema.parse(req.body);
    const user = await prisma.user.findUnique({
      where: { email: body.email.toLowerCase() },
    });
    if (!user?.passwordHash) {
      return res.status(401).json({ error: "Invalid email or password" });
    }
    const ok = await verifyPassword(user.passwordHash, body.password);
    if (!ok) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    await issueSession(user, res);
    await mergeCartAfterAuth(req, user.id);
    return res.json({ user: toUserPublic(user) });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: "Validation failed", details: err.flatten() });
    }
    return next(err);
  }
});

authRouter.post("/logout", requireAuth, async (req, res, next) => {
  try {
    const raw = req.cookies?.[REFRESH_COOKIE];
    if (raw) await revokeRefreshToken(raw);
    clearAuthCookies(res);
    return res.json({ ok: true });
  } catch (err) {
    return next(err);
  }
});

authRouter.post("/refresh", async (req, res, next) => {
  try {
    const raw = req.cookies?.[REFRESH_COOKIE];
    if (!raw) {
      return res.status(401).json({ error: "No refresh token" });
    }

    const rotated = await rotateRefreshToken(raw);
    if (!rotated) {
      clearAuthCookies(res);
      return res.status(401).json({ error: "Invalid refresh token" });
    }

    const user = await prisma.user.findUnique({ where: { id: rotated.userId } });
    if (!user) {
      clearAuthCookies(res);
      return res.status(401).json({ error: "User not found" });
    }

    const accessToken = signAccessToken({
      sub: user.id,
      email: user.email,
      role: user.role,
    });
    setAuthCookies(res, accessToken, rotated.newRawToken);
    return res.json({ user: toUserPublic(user) });
  } catch (err) {
    return next(err);
  }
});

authRouter.get("/me", requireAuth, async (req, res) => {
  return res.json({ user: toUserPublic(req.user!) });
});

const forgotLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 8,
  standardHeaders: true,
  legacyHeaders: false,
});

authRouter.post("/forgot-password", forgotLimiter, async (req, res, next) => {
  try {
    const { email } = z.object({ email: z.string().email() }).parse(req.body);
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });
    // Always 200 — don't leak whether the email exists.
    if (user?.passwordHash) {
      const raw = crypto.randomBytes(32).toString("hex");
      const tokenHash = crypto.createHash("sha256").update(raw).digest("hex");
      await prisma.user.update({
        where: { id: user.id },
        data: {
          passwordResetToken: tokenHash,
          passwordResetExpires: new Date(Date.now() + 60 * 60 * 1000),
        },
      });
      const resetUrl = `${env.webUrl}/reset-password?token=${raw}`;
      try {
        await enqueueTransactionalMail({
          kind: "password_reset",
          to: user.email,
          data: { name: user.name, resetUrl },
          idempotencyKey: `reset:${user.id}:${tokenHash.slice(0, 12)}`,
        });
      } catch (mailErr) {
        // Still 200 below — do not leak account existence or mail outages.
        console.warn("[auth] forgot-password mail failed:", mailErr);
      }
    }
    return res.json({
      ok: true,
      message:
        "If that email is on file, we’ve sent reset instructions.",
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: "Enter a valid email address." });
    }
    return next(err);
  }
});

authRouter.post("/reset-password", forgotLimiter, async (req, res, next) => {
  try {
    const { token, password } = z
      .object({
        token: z.string().min(20),
        password: z.string().min(8).max(128),
      })
      .parse(req.body);
    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
    const user = await prisma.user.findFirst({
      where: {
        passwordResetToken: tokenHash,
        passwordResetExpires: { gt: new Date() },
      },
    });
    if (!user) {
      return res.status(400).json({
        error: "This reset link is invalid or has expired. Request a new one.",
      });
    }
    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash: await hashPassword(password),
        passwordResetToken: null,
        passwordResetExpires: null,
      },
    });
    await issueSession(user, res);
    return res.json({ user: toUserPublic(user) });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({
        error: "Password must be at least 8 characters.",
      });
    }
    return next(err);
  }
});

const verifyLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
});

/** Confirm email via token from the verification message. */
authRouter.post("/verify-email", verifyLimiter, async (req, res, next) => {
  try {
    const { token } = z.object({ token: z.string().min(20) }).parse(req.body);
    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
    const user = await prisma.user.findFirst({
      where: {
        emailVerificationToken: tokenHash,
        emailVerificationExpires: { gt: new Date() },
      },
    });
    if (!user) {
      return res.status(400).json({
        error: "This verification link is invalid or has expired.",
      });
    }
    const updated = await prisma.user.update({
      where: { id: user.id },
      data: {
        emailVerifiedAt: new Date(),
        emailVerificationToken: null,
        emailVerificationExpires: null,
      },
    });
    return res.json({ user: toUserPublic(updated), ok: true });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: "Missing verification token." });
    }
    return next(err);
  }
});

/** Resend verification email (auth required). */
authRouter.post(
  "/resend-verification",
  requireAuth,
  verifyLimiter,
  async (req, res, next) => {
    try {
      const user = await prisma.user.findUnique({
        where: { id: req.user!.id },
      });
      if (!user) return res.status(404).json({ error: "User not found" });
      if (user.emailVerifiedAt) {
        return res.json({ ok: true, alreadyVerified: true });
      }
      const verifyRaw = crypto.randomBytes(32).toString("hex");
      const verifyHash = crypto
        .createHash("sha256")
        .update(verifyRaw)
        .digest("hex");
      await prisma.user.update({
        where: { id: user.id },
        data: {
          emailVerificationToken: verifyHash,
          emailVerificationExpires: new Date(Date.now() + 24 * 60 * 60 * 1000),
        },
      });
      const verifyUrl = `${env.webUrl}/verify-email?token=${verifyRaw}`;
      await enqueueTransactionalMail({
        kind: "verify_email",
        to: user.email,
        data: { name: user.name, verifyUrl },
        idempotencyKey: `verify-resend:${user.id}:${Date.now()}`,
      });
      return res.json({ ok: true });
    } catch (err) {
      return next(err);
    }
  }
);

/** Start Google OAuth2 — redirects to Google consent screen. */
authRouter.get("/google", (req, res) => {
  if (!env.googleClientId || !env.googleClientSecret) {
    return res.status(503).json({
      error: "Google OAuth is not configured. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET.",
    });
  }

  const client = new OAuth2Client(
    env.googleClientId,
    env.googleClientSecret,
    env.googleCallbackUrl
  );
  const returnTo =
    typeof req.query.returnTo === "string" ? req.query.returnTo : "";
  const role = req.query.role === "seller" ? "seller" : "";
  const statePayload = JSON.stringify({ returnTo, role });
  const url = client.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: ["openid", "email", "profile"],
    state: Buffer.from(statePayload).toString("base64url"),
  });
  return res.redirect(url);
});

authRouter.get("/google/callback", async (req, res, next) => {
  try {
    if (!env.googleClientId || !env.googleClientSecret) {
      return res.status(503).send("Google OAuth is not configured");
    }

    const code = req.query.code;
    if (typeof code !== "string") {
      return res.status(400).send("Missing authorization code");
    }

    const client = new OAuth2Client(
      env.googleClientId,
      env.googleClientSecret,
      env.googleCallbackUrl
    );
    const { tokens } = await client.getToken(code);
    client.setCredentials(tokens);

    const ticket = await client.verifyIdToken({
      idToken: tokens.id_token!,
      audience: env.googleClientId,
    });
    const payload = ticket.getPayload();
    if (!payload?.email || !payload.sub) {
      return res.status(400).send("Google account missing email");
    }

    const email = payload.email.toLowerCase();
    let user = await prisma.user.findFirst({
      where: {
        OR: [{ googleId: payload.sub }, { email }],
      },
    });
    let isNewUser = false;

    const googleName =
      typeof payload.name === "string" && payload.name.trim()
        ? payload.name.trim().slice(0, 120)
        : null;

    if (user) {
      const linkData: {
        googleId?: string;
        name?: string;
        emailVerifiedAt?: Date;
      } = {};
      if (!user.googleId) linkData.googleId = payload.sub;
      if (!user.name && googleName) linkData.name = googleName;
      if (!user.emailVerifiedAt) linkData.emailVerifiedAt = new Date();
      if (Object.keys(linkData).length > 0) {
        user = await prisma.user.update({
          where: { id: user.id },
          data: linkData,
        });
      }
    } else {
      isNewUser = true;
      let intendedRole: "buyer" | "seller" = "buyer";
      if (typeof req.query.state === "string" && req.query.state) {
        try {
          const decoded = Buffer.from(req.query.state, "base64url").toString(
            "utf8"
          );
          const parsed = JSON.parse(decoded) as { role?: string };
          if (parsed.role === "seller") intendedRole = "seller";
        } catch {
          /* ignore */
        }
      }
      user = await prisma.user.create({
        data: {
          email,
          googleId: payload.sub,
          role: intendedRole,
          name: googleName,
          passwordHash: null,
          emailVerifiedAt: new Date(),
        },
      });

      void enqueueTransactionalMail({
        kind: "welcome",
        to: user.email,
        data: {
          name: user.name,
          appName: env.appName,
          dashboardUrl:
            intendedRole === "seller"
              ? `${env.webUrl}/onboarding`
              : `${env.webUrl}/explore`,
        },
        idempotencyKey: `welcome:${user.id}`,
      }).catch((e) => console.warn("[auth] google welcome mail failed", e));
    }

    await issueSession(user, res);
    await mergeCartAfterAuth(req, user.id);

    let returnTo: string | null = null;
    if (typeof req.query.state === "string" && req.query.state) {
      try {
        const decoded = Buffer.from(req.query.state, "base64url").toString(
          "utf8"
        );
        if (decoded.startsWith("/") && !decoded.startsWith("//")) {
          returnTo = decoded;
        } else {
          const parsed = JSON.parse(decoded) as {
            returnTo?: string;
            role?: string;
          };
          if (
            typeof parsed.returnTo === "string" &&
            parsed.returnTo.startsWith("/") &&
            !parsed.returnTo.startsWith("//")
          ) {
            returnTo = parsed.returnTo;
          }
        }
      } catch {
        /* ignore bad state */
      }
    }
    const roleHome =
      user.role === "super_admin"
        ? "/admin"
        : user.role === "seller" || user.role === "tenant_admin"
          ? "/seller"
          : "/buyer";
    const dest = returnTo
      ? `${env.webUrl}${returnTo}`
      : isNewUser && user.role === "seller"
        ? `${env.webUrl}/onboarding`
        : `${env.webUrl}${roleHome}`;
    return res.redirect(dest);
  } catch (err) {
    return next(err);
  }
});
