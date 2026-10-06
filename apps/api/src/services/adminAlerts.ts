import { env } from "../config/env";
import { getPlatformSetting } from "../lib/platformSettings";
import { enqueueTransactionalMail } from "../queue/transactionalMail";

/**
 * Emails the platform operators about something that needs a human (payment
 * mismatches, failed refunds, bank detail changes). Never throws.
 */
export async function alertAdmins(alert: {
  title: string;
  lines: string[];
  path?: string;
  idempotencyKey?: string;
}): Promise<void> {
  try {
    const to =
      process.env.ADMIN_ALERT_EMAIL?.trim() ||
      (await getPlatformSetting("support_email", "support@shopmi.ng"));
    console.warn(`[admin-alert] ${alert.title}: ${alert.lines.join(" | ")}`);
    await enqueueTransactionalMail({
      kind: "admin_alert",
      to,
      data: {
        title: alert.title,
        body: alert.lines.join("\n"),
        actionUrl: alert.path ? `${env.webUrl}${alert.path}` : undefined,
      },
      idempotencyKey: alert.idempotencyKey,
    });
  } catch (err) {
    console.error("[admin-alert] failed:", err instanceof Error ? err.message : err);
  }
}
