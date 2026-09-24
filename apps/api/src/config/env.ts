import path from "path";
import dotenv from "dotenv";

// Load root .env then apps/api/.env (local overrides)
dotenv.config({ path: path.resolve(__dirname, "../../../.env") });
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required env var: ${name}`);
  }
  return value;
}

export const env = {
  nodeEnv: process.env.NODE_ENV ?? "development",
  port: Number(process.env.PORT ?? 4000),
  databaseUrl: required("DATABASE_URL"),
  jwtAccessSecret: required("JWT_ACCESS_SECRET"),
  jwtRefreshSecret: required("JWT_REFRESH_SECRET"),
  jwtAccessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN ?? "15m",
  jwtRefreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN ?? "7d",
  googleClientId: process.env.GOOGLE_CLIENT_ID ?? "",
  googleClientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
  googleCallbackUrl:
    process.env.GOOGLE_CALLBACK_URL ??
    "http://localhost:4000/api/auth/google/callback",
  appName: process.env.APP_NAME ?? "Vendors",
  apiUrl: process.env.API_URL ?? "http://localhost:4000",
  webUrl: process.env.WEB_URL ?? "http://localhost:3000",
  cookieDomain: process.env.COOKIE_DOMAIN ?? "localhost",
  isProd: (process.env.NODE_ENV ?? "development") === "production",
  // Secrets — stay in .env, never platform_settings
  paystackSecretKey: process.env.PAYSTACK_SECRET_KEY ?? "",
  paystackPublicKey: process.env.PAYSTACK_PUBLIC_KEY ?? "",
  resendApiKey: process.env.RESEND_API_KEY ?? "",
  emailFrom: process.env.EMAIL_FROM ?? "Vendors <onboarding@resend.dev>",
  openaiApiKey: process.env.OPENAI_API_KEY ?? "",
  anthropicApiKey: process.env.ANTHROPIC_API_KEY ?? "",
  anthropicModel: process.env.ANTHROPIC_MODEL ?? "claude-sonnet-4-20250514",
  redisUrl: process.env.REDIS_URL ?? "redis://localhost:6379",
  shopBaseDomain: process.env.SHOP_BASE_DOMAIN ?? "localhost:3000",
  /** Comma-separated absolute origins for preview / staging (prod CORS). */
  allowedOrigins: process.env.ALLOWED_ORIGINS ?? "",
  /** Cloudflare Turnstile (contact forms). Site key is public; secret stays server-side. */
  turnstileSiteKey: process.env.TURNSTILE_SITE_KEY ?? "",
  turnstileSecretKey: process.env.TURNSTILE_SECRET_KEY ?? "",
  /** Non-prod only — skip Turnstile verification for automated tests. */
  contactCaptchaBypass:
    (process.env.CONTACT_CAPTCHA_BYPASS ?? "").toLowerCase() === "true",
  /** Days to retain ContactInquiry rows before purge (REM-16). Default 180. */
  contactInquiryRetentionDays: Number(
    process.env.CONTACT_INQUIRY_RETENTION_DAYS ?? 180
  ),
  /**
   * When true, shop contact forms require the submitter to confirm via email
   * before the shop is notified (REM-17). Platform contact is unchanged.
   */
  shopContactConfirmRequired:
    (process.env.SHOP_CONTACT_CONFIRM_REQUIRED ?? "").toLowerCase() === "true",
  whatsappToken: process.env.WHATSAPP_TOKEN ?? "",
  whatsappPhoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID ?? "",
  uploadsDir: path.resolve(__dirname, "../../uploads"),
};
