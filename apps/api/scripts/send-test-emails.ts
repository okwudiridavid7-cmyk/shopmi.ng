/**
 * Send one Chipper-style transactional email of each kind to a test inbox.
 *
 * Usage:
 *   cd apps/api && npx tsx scripts/send-test-emails.ts
 *
 * Override recipient:
 *   TEST_EMAIL=you@example.com npx tsx scripts/send-test-emails.ts
 */
import path from "path";
import dotenv from "dotenv";

dotenv.config({ path: path.resolve(__dirname, "../../../.env") });
dotenv.config({ path: path.resolve(__dirname, "../.env") });

import { sendHtmlEmail } from "../src/services/mail";
import {
  buildTransactionalEmail,
  type TransactionalEmailKind,
} from "../src/services/transactionalEmails";

const TO = process.env.TEST_EMAIL ?? "okwudiridavid7@gmail.com";

const SAMPLES: {
  kind: TransactionalEmailKind;
  data: Record<string, string>;
}[] = [
  {
    kind: "welcome",
    data: {
      name: "David",
      appName: "Shopmi.ng",
      dashboardUrl: "https://shopmi.ng/explore",
    },
  },
  {
    kind: "verify_email",
    data: {
      name: "David",
      verifyUrl: "https://shopmi.ng/verify-email?token=test-token",
    },
  },
  {
    kind: "password_reset",
    data: {
      name: "David",
      resetUrl: "https://shopmi.ng/reset-password?token=test-token",
    },
  },
  {
    kind: "order_buyer",
    data: {
      name: "David",
      shopName: "Greenfield Crafts",
      totalLabel: "NGN 17,000.00",
      reference: "ord_test_buyer_001",
      orderId: "ord_test",
      itemsHtml:
        "<p style='margin:0'>Adire Wrap Dress × 1 — NGN 17,000.00</p>",
      orderUrl: "https://shopmi.ng/buyer/orders",
    },
  },
  {
    kind: "order_seller",
    data: {
      name: "Ada",
      totalLabel: "NGN 17,000.00",
      buyerEmail: "okwudiridavid7@gmail.com",
      itemsHtml:
        "<p style='margin:0'>Adire Wrap Dress × 1 — NGN 17,000.00</p>",
      ordersUrl: "https://shopmi.ng/seller/orders",
    },
  },
  {
    kind: "verification_approved",
    data: {
      name: "Ada",
      shopName: "Greenfield Crafts",
      dashboardUrl: "https://shopmi.ng/seller",
    },
  },
  {
    kind: "verification_rejected",
    data: {
      name: "Ada",
      shopName: "Greenfield Crafts",
      reason: "ID photo was blurry — please upload a clearer scan.",
      verificationUrl: "https://shopmi.ng/seller/verification",
    },
  },
];

async function main() {
  if (!process.env.RESEND_API_KEY) {
    throw new Error("RESEND_API_KEY is not set in .env");
  }

  console.log(`Sending ${SAMPLES.length} test emails → ${TO}`);
  const results: { kind: string; ok: boolean; error?: string; id?: string }[] =
    [];

  for (const sample of SAMPLES) {
    try {
      const built = await buildTransactionalEmail(sample.kind, sample.data);
      const res = await sendHtmlEmail({
        to: TO,
        subject: `[TEST] ${built.subject}`,
        html: built.html,
        idempotencyKey: `test:${sample.kind}:${Date.now()}`,
      });
      results.push({
        kind: sample.kind,
        ok: true,
        id: res.providerMessageId ?? undefined,
      });
      console.log(`✓ ${sample.kind}  id=${res.providerMessageId}`);
      // Gentle spacing for provider rate limits
      await new Promise((r) => setTimeout(r, 600));
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      results.push({ kind: sample.kind, ok: false, error: msg });
      console.error(`✗ ${sample.kind}  ${msg}`);
    }
  }

  const failed = results.filter((r) => !r.ok);
  console.log(
    `\nDone: ${results.length - failed.length}/${results.length} sent`
  );
  if (failed.length) {
    console.error("Failures:", failed);
    process.exit(1);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
