import { Router, raw } from "express";
import { fulfillPaidOrder, verifyPaystackSignature } from "../services/orders";

export const paystackRouter = Router();

/**
 * Paystack webhook — verify HMAC signature; never trust client-side payment success.
 * Mounted with express.raw for this path only (see index.ts).
 */
paystackRouter.post(
  "/webhook",
  raw({ type: "application/json" }),
  async (req, res) => {
    try {
      const signature = req.headers["x-paystack-signature"];
      const rawBody = Buffer.isBuffer(req.body)
        ? req.body
        : Buffer.from(JSON.stringify(req.body));

      if (
        !verifyPaystackSignature(
          rawBody,
          typeof signature === "string" ? signature : undefined
        )
      ) {
        return res.status(401).json({ error: "Invalid signature" });
      }

      const event = JSON.parse(rawBody.toString("utf8")) as {
        event: string;
        data: { reference: string; status: string };
      };

      if (event.event === "charge.success" && event.data?.reference) {
        await fulfillPaidOrder(event.data.reference);
      }

      return res.sendStatus(200);
    } catch (err) {
      console.error("[paystack webhook]", err);
      return res.status(500).json({ error: "Webhook handler failed" });
    }
  }
);
