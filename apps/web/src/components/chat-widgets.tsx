"use client";

import { useEffect } from "react";

export function ChatWidgets({
  whatsappUrl,
  chatbotHtml,
}: {
  whatsappUrl?: string | null;
  chatbotHtml?: string | null;
}) {
  useEffect(() => {
    if (!chatbotHtml?.trim()) return;
    const host = document.createElement("div");
    host.id = "vendors-chatbot-host";
    host.innerHTML = chatbotHtml;
    document.body.appendChild(host);
    const scripts = Array.from(host.querySelectorAll("script"));
    for (const old of scripts) {
      const s = document.createElement("script");
      for (const attr of Array.from(old.attributes)) {
        s.setAttribute(attr.name, attr.value);
      }
      s.textContent = old.textContent;
      old.replaceWith(s);
    }
    return () => {
      host.remove();
    };
  }, [chatbotHtml]);

  if (!whatsappUrl?.trim()) return null;

  const href = whatsappUrl.startsWith("http")
    ? whatsappUrl
    : `https://wa.me/${whatsappUrl.replace(/\D/g, "")}`;

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
