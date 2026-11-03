import { prisma } from "../db/prisma";
import {
  formatE164,
  generateOtpCode,
  hashOtp,
  sendPhoneOtpTemplate,
  whatsappConfigured,
} from "./whatsapp";

const OTP_TTL_MS = 10 * 60 * 1000;
const RESEND_COOLDOWN_MS = 60_000;

export class PhoneVerificationError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.name = "PhoneVerificationError";
    this.status = status;
  }
}

/**
 * Sends a WhatsApp OTP to `phoneRaw` and stores a hash on the user.
 * Normalizes phone + whatsappNumber to the same E.164; verified only after confirm.
 */
export async function requestPhoneOtp(
  userId: string,
  phoneRaw: string
): Promise<{ ok: true; expiresAt: string; preview?: string }> {
  const e164 = formatE164(phoneRaw);
  if (!e164) {
    throw new PhoneVerificationError(
      "Enter a valid mobile number, e.g. 0803… or +234…"
    );
  }

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new PhoneVerificationError("User not found", 404);

  if (
    user.phoneOtpExpires &&
    user.phoneOtpExpires.getTime() - OTP_TTL_MS + RESEND_COOLDOWN_MS > Date.now()
  ) {
    throw new PhoneVerificationError(
      "Wait a minute before requesting another code.",
      429
    );
  }

  const code = generateOtpCode();
  const expiresAt = new Date(Date.now() + OTP_TTL_MS);

  await prisma.user.update({
    where: { id: userId },
    data: {
      phone: e164,
      whatsappNumber: e164,
      phoneVerifiedAt: null,
      phoneOtpHash: hashOtp(code),
      phoneOtpExpires: expiresAt,
    },
  });

  const result = await sendPhoneOtpTemplate(e164, code);
  if (result.skipped && !whatsappConfigured()) {
    return {
      ok: true,
      expiresAt: expiresAt.toISOString(),
      // Local/dev only so QA can complete the flow without Meta keys.
      preview: process.env.NODE_ENV === "production" ? undefined : code,
    };
  }

  return { ok: true, expiresAt: expiresAt.toISOString() };
}

export async function confirmPhoneOtp(
  userId: string,
  codeRaw: string
): Promise<{ ok: true }> {
  const code = codeRaw.replace(/\D/g, "");
  if (code.length !== 6) {
    throw new PhoneVerificationError("Enter the 6-digit code from WhatsApp.");
  }

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user?.phoneOtpHash || !user.phoneOtpExpires) {
    throw new PhoneVerificationError("Request a new code first.");
  }
  if (user.phoneOtpExpires < new Date()) {
    throw new PhoneVerificationError("That code has expired. Request a new one.");
  }
  if (user.phoneOtpHash !== hashOtp(code)) {
    throw new PhoneVerificationError("Incorrect code. Check WhatsApp and try again.");
  }

  await prisma.user.update({
    where: { id: userId },
    data: {
      phoneVerifiedAt: new Date(),
      phoneOtpHash: null,
      phoneOtpExpires: null,
    },
  });

  return { ok: true };
}
