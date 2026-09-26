"use client";

import dynamic from "next/dynamic";
import { useCallback, useState } from "react";
import { apiFetch } from "@/lib/api";
import { usePlatformBranding } from "@/hooks/use-branding";
import {
  CONTACT_INTENTS,
  CONTACT_PROMISES,
  CONTACT_SUCCESS_MESSAGE,
  CONTACT_TOPICS,
} from "@/lib/contact-copy";

const ContactWithGlobe = dynamic(
  () => import("@/components/ui/contact-with-globe"),
  {
    ssr: false,
    loading: () => (
      <div className="flex min-h-[28rem] items-center justify-center bg-background px-4 py-20 text-sm text-muted-foreground">
        Loading contact…
      </div>
    ),
  }
);

export default function ContactPage() {
  const b = usePlatformBranding().data;
  const supportEmail = b?.supportEmail ?? "support@shopmi.ng";
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const onSubmit = useCallback(
    async (data: {
      name: string;
      company: string;
      email: string;
      message: string;
      topic: string;
      intent: string;
    }) => {
      setBusy(true);
      setMsg(null);
      setErr(null);
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
          }),
        });
        setMsg(CONTACT_SUCCESS_MESSAGE);
      } catch (error) {
        setErr(
          error instanceof Error
            ? error.message
            : "Couldn’t send that just now. Try again in a moment."
        );
      } finally {
        setBusy(false);
      }
    },
    []
  );

  return (
    <ContactWithGlobe
      title="Tell us about your project"
      subtitle="Contact"
      description="We read every message and reply as soon as we can on business days."
      supportEmail={supportEmail}
      promises={CONTACT_PROMISES}
      topics={CONTACT_TOPICS}
      intents={CONTACT_INTENTS}
      onSubmit={onSubmit}
      busy={busy}
      error={err}
      success={msg}
    />
  );
}
