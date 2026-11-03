/**
 * Refresh-token happy path against the local database.
 * Run: pnpm --filter @vendors/api test:integration
 */
import assert from "node:assert/strict";
import crypto from "node:crypto";
import { after, before, describe, it } from "node:test";
import { prisma } from "../db/prisma";
import {
  issueRefreshToken,
  rotateRefreshToken,
  signAccessToken,
  verifyAccessToken,
} from "../auth/tokens";

const run = crypto.randomBytes(4).toString("hex");
let userId = "";

before(async () => {
  const user = await prisma.user.create({
    data: {
      email: `refresh-${run}@test.invalid`,
      role: "buyer",
      name: "Refresh Tester",
    },
  });
  userId = user.id;
});

after(async () => {
  await prisma.refreshToken.deleteMany({ where: { userId } });
  await prisma.user.delete({ where: { id: userId } }).catch(() => undefined);
});

describe("refresh token rotation", () => {
  it("issues a new refresh token and keeps the user id", async () => {
    const raw = await issueRefreshToken(userId);
    const rotated = await rotateRefreshToken(raw);
    assert.ok(rotated);
    assert.equal(rotated!.userId, userId);
    assert.notEqual(rotated!.newRawToken, raw);

    const access = signAccessToken({
      sub: userId,
      email: `refresh-${run}@test.invalid`,
      role: "buyer",
    });
    const payload = verifyAccessToken(access);
    assert.equal(payload.sub, userId);
  });

  it("rejects an already-rotated token outside the grace window", async () => {
    const raw = await issueRefreshToken(userId);
    const first = await rotateRefreshToken(raw);
    assert.ok(first);
    // Immediate reuse within grace returns null (treated as race), not theft.
    const second = await rotateRefreshToken(raw);
    assert.equal(second, null);
  });
});
