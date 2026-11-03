import { env } from "../config/env";

/**
 * Optional Sentry. Set SENTRY_DSN to enable. No-op when unset so local/dev stays free of noise.
 * Install `@sentry/node` on the API package when enabling in production.
 */
export function initSentry(service: "api" | "worker"): void {
  const dsn = process.env.SENTRY_DSN?.trim();
  if (!dsn) return;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const Sentry = require("@sentry/node") as typeof import("@sentry/node");
    Sentry.init({
      dsn,
      environment: env.nodeEnv,
      serverName: service,
      tracesSampleRate: 0.05,
    });
    console.log(`[sentry] enabled for ${service}`);
  } catch (err) {
    console.warn(
      "[sentry] SENTRY_DSN is set but @sentry/node is not installed:",
      err instanceof Error ? err.message : err
    );
  }
}

export function captureException(err: unknown): void {
  if (!process.env.SENTRY_DSN?.trim()) return;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const Sentry = require("@sentry/node") as typeof import("@sentry/node");
    Sentry.captureException(err);
  } catch {
    /* optional */
  }
}
