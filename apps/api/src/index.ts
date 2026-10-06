import express from "express";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";
import cookieParser from "cookie-parser";
import path from "path";
import { env } from "./config/env";
import { ensureFontconfig } from "./lib/fonts";
import { originTrust, requireTrustedOrigin } from "./lib/originCheck";
import { clientIpMiddleware } from "./lib/clientIp";
import { r2Configured } from "./lib/storage";

ensureFontconfig();
import { authRouter } from "./auth/routes";
import { tenantsRouter } from "./routes/tenants";
import { shopsRouter } from "./routes/shops";
import { platformSettingsRouter } from "./routes/platformSettings";
import { geoRouter } from "./routes/geo";
import { healthRouter } from "./routes/health";
import { catalogRouter } from "./routes/catalog";
import { sellerRouter } from "./routes/seller";
import { onboardingRouter } from "./routes/onboarding";
import { cartsRouter } from "./routes/carts";
import { checkoutRouter } from "./routes/checkout";
import { paystackRouter } from "./routes/paystack";
import { whatsappWebhookRouter } from "./routes/whatsappWebhook";
import { adminPayoutsRouter, sellerPayoutsRouter } from "./routes/payouts";
import { buyerRouter, ordersRouter } from "./routes/buyer";
import {
  adminVerificationRouter,
  sellerVerificationRouter,
} from "./routes/verification";
import {
  sellerCampaignsRouter,
  shopCampaignsRouter,
} from "./routes/campaigns";
import { productReviewsRouter } from "./routes/reviews";
import { ogRouter } from "./routes/og";
import { sellerAiRouter } from "./routes/sellerAi";
import { sellerToolsRouter, logoPublicRouter } from "./routes/sellerTools";
import { sellerAnalyticsRouter } from "./routes/sellerAnalytics";
import { adminRouter } from "./routes/admin";
import { adminDomainsRouter, sellerDomainStoreRouter } from "./routes/domainStore";
import { contactRouter } from "./routes/contact";
import { plansRouter } from "./routes/plans";
import {
  sellerTeamRouter,
  sellerDomainRouter,
  sellerNotificationsRouter,
  sellerPlanRouter,
  teamInvitesRouter,
} from "./routes/sellerPhase4";

const app = express();

// Render terminates TLS in front of us; client IP is resolved by clientIpMiddleware.
app.set("trust proxy", 1);
app.use(clientIpMiddleware);

app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
  })
);
app.use(compression());
app.use(
  cors((req, cb) => {
    originTrust(req.headers.origin)
      .then((trust) =>
        cb(null, {
          origin: trust !== "none",
          // Custom domains get plain CORS only; cookies stay on our own origins.
          credentials: trust === "trusted",
          maxAge: 86400,
        })
      )
      .catch(() => cb(null, { origin: false }));
  })
);
app.use(requireTrustedOrigin);

// Paystack + WhatsApp webhooks need the raw body for HMAC - mount before json parser
app.use("/api/paystack", paystackRouter);
app.use("/api/whatsapp", whatsappWebhookRouter);

// REM-09: tighter body limit for contact before the global 2mb parser
app.use("/api/contact", express.json({ limit: "32kb" }), contactRouter);

app.use(express.json({ limit: "2mb" }));
app.use(cookieParser());
// Local development only: production media is served from R2 on the media domain.
if (!r2Configured) {
  app.use(
    "/uploads",
    (_req, res, next) => {
      res.setHeader("X-Content-Type-Options", "nosniff");
      res.setHeader("Content-Security-Policy", "default-src 'none'; sandbox");
      next();
    },
    express.static(path.resolve(env.uploadsDir), {
      maxAge: "30d",
      immutable: true,
      dotfiles: "deny",
      index: false,
    })
  );
}

app.use(healthRouter);
app.use("/api/geo", geoRouter);
app.use("/api/auth", authRouter);
app.use("/api/tenants", tenantsRouter);
app.use("/api/shops", shopsRouter);
app.use("/api/shops/:slug/campaigns", shopCampaignsRouter);
app.use("/api/shops/:slug/products/:productId/reviews", productReviewsRouter);
app.use("/api/platform-settings", platformSettingsRouter);
app.use("/api/catalog", catalogRouter);
app.use("/api/plans", plansRouter);
app.use("/api/seller", sellerRouter);
app.use("/api/seller/verification", sellerVerificationRouter);
app.use("/api/seller/campaigns", sellerCampaignsRouter);
app.use("/api/seller/ai", sellerAiRouter);
app.use("/api/seller/tools", sellerToolsRouter);
app.use("/api/seller/analytics", sellerAnalyticsRouter);
app.use("/api/logo", logoPublicRouter);
app.use("/api/admin/verification-requests", adminVerificationRouter);
app.use("/api/admin", adminPayoutsRouter);
app.use("/api/admin", adminDomainsRouter);
app.use("/api/admin", adminRouter);
app.use("/api/seller/payouts", sellerPayoutsRouter);
app.use("/api/seller/team", sellerTeamRouter);
app.use("/api/team-invites", teamInvitesRouter);
app.use("/api/seller/domain", sellerDomainStoreRouter);
app.use("/api/seller/domain", sellerDomainRouter);
app.use("/api/seller/notifications", sellerNotificationsRouter);
app.use("/api/seller/plan", sellerPlanRouter);
app.use("/api/onboarding", onboardingRouter);
app.use("/api/carts", cartsRouter);
app.use("/api/checkout", checkoutRouter);
app.use("/api/buyer", buyerRouter);
app.use("/api/orders", ordersRouter);
app.use("/api/og", ogRouter);

app.use(
  (
    err: unknown,
    _req: express.Request,
    res: express.Response,
    _next: express.NextFunction
  ) => {
    if (
      err &&
      typeof err === "object" &&
      "type" in err &&
      (err as { type?: string }).type === "entity.too.large"
    ) {
      return res.status(413).json({
        error: "Request body is too large.",
        code: "PAYLOAD_TOO_LARGE",
      });
    }
    console.error(err);
    return res.status(500).json({ error: "Internal server error" });
  }
);

app.listen(env.port, () => {
  console.log(`API listening on ${env.apiUrl} (port ${env.port})`);
});
