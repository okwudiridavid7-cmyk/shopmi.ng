"use client";

import { useCallback, useState } from "react";
import ContactWithGlobe from "@/components/ui/contact-with-globe";
import { useToast } from "@/components/ui/toast";
import { apiFetch } from "@/lib/api";
import { usePlatformBranding } from "@/hooks/use-branding";
import {
  CONTACT_INTENTS,
  CONTACT_PROMISES,
  CONTACT_SUCCESS_MESSAGE,
  CONTACT_TOPICS,
} from "@/lib/contact-copy";

export default function ContactPage() {
  const b = usePlatformBranding().data;
  const supportEmail = b?.supportEmail ?? "support@shopmi.ng";
  const [busy, setBusy] = useState(false);
  const { toast } = useToast();

  const onSubmit = useCallback(
    async (data: {
      name: string;
      company: string;
      email: string;
      message: string;
      topic: string;
      intent: string;
      captchaToken: string | null;
    }) => {
      setBusy(true);
      try {
        const subject = `${data.topic} · ${data.intent}`;
        await apiFetch("/api/contact", {
          method: "POST",
          headers: {
            "Idempotency-Key":
              typeof crypto !== "undefined" && "randomUUID" in crypto
                ? crypto.randomUUID()
                : `contact-${Date.now()}-${Math.random().toString(36).slice(2)}`,
          },
          body: JSON.stringify({
            name: data.name,
            email: data.email,
            subject,
            message: data.company.trim()
              ? `${data.message}\n\nCompany: ${data.company.trim()}`
              : data.message,
            captchaToken: data.captchaToken || undefined,
          }),
        });
        toast({ title: "Message sent", description: CONTACT_SUCCESS_MESSAGE, tone: "success" });
      } catch (error) {
        toast({ title: "Message not sent", description: error instanceof Error ? error.message : "Please try again in a moment.", tone: "danger" });
      } finally {
        setBusy(false);
      }
    },
    [toast]
  );

  return (
    <ContactWithGlobe
      title="How can we help?"
      subtitle="Contact"
      supportEmail={supportEmail}
      turnstileSiteKey={b?.turnstileSiteKey ?? null}
      promises={CONTACT_PROMISES}
      topics={CONTACT_TOPICS}
      intents={CONTACT_INTENTS}
      onSubmit={onSubmit}
      busy={busy}
    />
  );
}
