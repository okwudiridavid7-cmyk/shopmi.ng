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
  // Secrets - stay in .env, never platform_settings
  paystackSecretKey: process.env.PAYSTACK_SECRET_KEY ?? "",
  paystackPublicKey: process.env.PAYSTACK_PUBLIC_KEY ?? "",
  resendApiKey: process.env.RESEND_API_KEY ?? "",
  emailFrom: process.env.EMAIL_FROM ?? "Vendors <onboarding@resend.dev>",
  anthropicApiKey: process.env.ANTHROPIC_API_KEY ?? "",
  /** Photoroom background removal for the image enhancer. Enhancer is hidden without it. */
  photoroomApiKey: process.env.PHOTOROOM_API_KEY ?? "",
  anthropicModel: process.env.ANTHROPIC_MODEL || "claude-sonnet-4-20250514",
  redisUrl: process.env.REDIS_URL ?? "redis://localhost:6379",
  shopBaseDomain: process.env.SHOP_BASE_DOMAIN ?? "localhost:3000",
  /** Comma-separated absolute origins for preview / staging (prod CORS). */
  allowedOrigins: process.env.ALLOWED_ORIGINS ?? "",
  /** Cloudflare Turnstile (contact forms). Site key is public; secret stays server-side. */
  turnstileSiteKey: process.env.TURNSTILE_SITE_KEY ?? "",
  turnstileSecretKey: process.env.TURNSTILE_SECRET_KEY ?? "",
  /** Non-prod only - skip Turnstile verification for automated tests. */
  contactCaptchaBypass:
    (process.env.CONTACT_CAPTCHA_BYPASS ?? "").toLowerCase() === "true",
  /** Days to retain ContactInquiry rows before purge (REM-16). Default 180. */
  contactInquiryRetentionDays: Number(
    process.env.CONTACT_INQUIRY_RETENTION_DAYS || 180
  ),
  /**
   * When true, shop contact forms require the submitter to confirm via email
   * before the shop is notified (REM-17). Platform contact is unchanged.
   */
  shopContactConfirmRequired:
    (process.env.SHOP_CONTACT_CONFIRM_REQUIRED ?? "").toLowerCase() === "true",
  whatsappToken: process.env.WHATSAPP_TOKEN ?? "",
  whatsappPhoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID ?? "",
  whatsappGraphVersion: process.env.WHATSAPP_GRAPH_VERSION || "v21.0",
  whatsappTemplateNewOrder: process.env.WHATSAPP_TEMPLATE_NEW_ORDER || "new_order",
  whatsappTemplateLang: process.env.WHATSAPP_TEMPLATE_LANG || "en",
  whatsappAppSecret: process.env.WHATSAPP_APP_SECRET ?? "",
  whatsappVerifyToken: process.env.WHATSAPP_VERIFY_TOKEN ?? "",
  uploadsDir: path.resolve(__dirname, "../../uploads"),
  /** Local fallback for invoices / KYC when R2 isn't configured. Never served statically. */
  privateUploadsDir: path.resolve(__dirname, "../../uploads-private"),
  /** Cloudflare R2 (S3 API). When unset, files go to local disk (dev only). */
  r2AccountId: process.env.R2_ACCOUNT_ID ?? "",
  r2AccessKeyId: process.env.R2_ACCESS_KEY_ID ?? "",
  r2SecretAccessKey: process.env.R2_SECRET_ACCESS_KEY ?? "",
  r2PublicBucket: process.env.R2_PUBLIC_BUCKET ?? "",
  r2PrivateBucket: process.env.R2_PRIVATE_BUCKET ?? "",
  /** Public origin of the media bucket, e.g. https://media.shopmi.ng (cookieless). */
  mediaUrl: (process.env.MEDIA_URL ?? "").replace(/\/$/, ""),
  /** Seller custom domains: subdomains CNAME here, root domains use the A record. */
  customDomainCnameTarget:
    process.env.CUSTOM_DOMAIN_CNAME_TARGET || "shopmi-web.onrender.com",
  customDomainARecord: process.env.CUSTOM_DOMAIN_A_RECORD || "216.24.57.1",
  /** When both are set, verified seller domains are attached to the web service (Render issues TLS). */
  renderApiKey: process.env.RENDER_API_KEY ?? "",
  renderWebServiceId: process.env.RENDER_WEB_SERVICE_ID ?? "",
  /** GO54 (WhoGoHost) domain reseller API. Domain purchases are off in production without these. */
  go54ApiEmail: process.env.GO54_API_EMAIL ?? "",
  go54ApiKey: process.env.GO54_API_KEY ?? "",
  go54ApiUrl:
    process.env.GO54_API_URL ||
    "https://www.whogohost.com/host/modules/addons/DomainsReseller/api/index.php",
  /** Nameservers set on new registrations; must be the registrar's DNS so records can be managed via the API. */
  go54Nameservers: (process.env.GO54_NAMESERVERS || "nsa.whogohost.com,nsb.whogohost.com")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean),
};
