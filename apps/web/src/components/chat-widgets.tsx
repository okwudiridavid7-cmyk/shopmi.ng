"use client";

import { useEffect } from "react";
import type { ChatEmbed } from "@vendors/shared-types";
import { useCookieConsent } from "@/components/cookie-consent";
import { chatScriptSrc } from "@/lib/chat-embed";
import { whatsappHref } from "@/lib/safe-url";

export function ChatWidgets({
  whatsappUrl,
  chatEmbed,
}: {
  whatsappUrl?: string | null;
  chatEmbed?: ChatEmbed | null;
}) {
  const { hasConsent } = useCookieConsent();
  // Third-party chat embeds set their own cookies - load only after functional consent.
  const chatAllowed = hasConsent("functional");
  const provider = chatEmbed?.provider;
  const embedId = chatEmbed?.id;

  useEffect(() => {
    if (!chatAllowed || !provider || !embedId) return;
    const embed = { provider, id: embedId };
    const src = chatScriptSrc(embed);
    if (!src) return;
    if (provider === "crisp") {
      const w = window as unknown as { $crisp?: unknown[]; CRISP_WEBSITE_ID?: string };
      w.$crisp = [];
      w.CRISP_WEBSITE_ID = embedId;
    }
    const s = document.createElement("script");
    s.src = src;
    s.async = true;
    s.id = "shopmi-chat-widget";
    s.referrerPolicy = "strict-origin-when-cross-origin";
    document.body.appendChild(s);
    return () => {
      s.remove();
    };
  }, [chatAllowed, provider, embedId]);

  const href = whatsappHref(whatsappUrl);
  if (!href) return null;

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Chat on WhatsApp"
      className="fixed bottom-5 right-5 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-[#25D366] text-white shadow-lg transition hover:scale-105"
    >
      <svg viewBox="0 0 24 24" className="h-7 w-7" fill="currentColor" aria-hidden>
        <path d="M12 2a10 10 0 0 0-8.7 15l-1.1 4 4.1-1.1A10 10 0 1 0 12 2zm5.6 14.2c-.2.7-1.3 1.2-2.1 1.4-.6.1-1.3.2-3.8-.8-3.2-1.3-5.2-4.6-5.4-4.8-.2-.2-1.5-2-1.5-3.8s1-2.7 1.3-3.1c.3-.4.7-.5 1-.5h.7c.2 0 .5 0 .7.6l1 2.4c.1.2.1.4 0 .6l-.4.7c-.2.3-.4.5-.2.8.2.3.8 1.3 1.8 2.1 1.2 1 2.2 1.3 2.5 1.5.3.1.5.1.7-.1l.8-1.1c.2-.2.4-.2.7-.1l2.2 1c.3.1.5.2.6.4.1.2.1 1.1-.1 1.8z" />
      </svg>
    </a>
  );
}
