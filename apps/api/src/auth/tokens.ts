import crypto from "crypto";
import jwt from "jsonwebtoken";
import type { UserRole } from "@prisma/client";
import { env } from "../config/env";
import { prisma } from "../db/prisma";

export type AccessTokenPayload = {
  sub: string;
  email: string;
  role: UserRole;
  iat?: number;
};

/** A refresh token presented again shortly after rotation is a race between tabs, not theft. */
const REUSE_GRACE_MS = 30_000;

export function signAccessToken(payload: AccessTokenPayload): string {
  return jwt.sign(payload, env.jwtAccessSecret, {
    algorithm: "HS256",
    expiresIn: env.jwtAccessExpiresIn,
  } as jwt.SignOptions);
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  return jwt.verify(token, env.jwtAccessSecret, { algorithms: ["HS256"] }) as AccessTokenPayload;
}

function hashToken(raw: string): string {
  return crypto.createHash("sha256").update(raw).digest("hex");
}

function parseDurationMs(duration: string): number {
  const match = /^(\d+)([smhd])$/.exec(duration);
  if (!match) return 7 * 24 * 60 * 60 * 1000;
  const n = Number(match[1]);
  const unit = match[2];
  const mult =
    unit === "s" ? 1000 : unit === "m" ? 60_000 : unit === "h" ? 3_600_000 : 86_400_000;
  return n * mult;
}

export async function issueRefreshToken(userId: string): Promise<string> {
  const raw = crypto.randomBytes(48).toString("hex");
  const tokenHash = hashToken(raw);
  const expiresAt = new Date(Date.now() + parseDurationMs(env.jwtRefreshExpiresIn));

  await prisma.refreshToken.create({
    data: { userId, tokenHash, expiresAt },
  });

  return raw;
}

export async function rotateRefreshToken(
  rawToken: string
): Promise<{ userId: string; newRawToken: string } | null> {
  const tokenHash = hashToken(rawToken);
  const existing = await prisma.refreshToken.findFirst({ where: { tokenHash } });
  if (!existing) return null;

  if (existing.revokedAt) {
    // A rotated-out token came back: someone else has a copy. End every session.
    if (Date.now() - existing.revokedAt.getTime() > REUSE_GRACE_MS) {
      await revokeAllSessions(existing.userId);
    }
    return null;
  }

  const claimed = await prisma.refreshToken.updateMany({
    where: { id: existing.id, revokedAt: null },
    data: { revokedAt: new Date() },
  });
  if (claimed.count === 0 || existing.expiresAt < new Date()) return null;

  const newRawToken = await issueRefreshToken(existing.userId);
  return { userId: existing.userId, newRawToken };
}

/** Signs the user out everywhere: refresh tokens revoked, outstanding access tokens rejected. */
export async function revokeAllSessions(userId: string): Promise<void> {
  const now = new Date();
  await prisma.$transaction([
    prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: now },
    }),
    prisma.user.update({ where: { id: userId }, data: { sessionsRevokedAt: now } }),
  ]);
}

export async function revokeRefreshToken(rawToken: string): Promise<void> {
  const tokenHash = hashToken(rawToken);
  await prisma.refreshToken.updateMany({
    where: { tokenHash, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}
