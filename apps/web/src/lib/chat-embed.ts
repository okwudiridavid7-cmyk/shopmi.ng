import type { ChatEmbed, ChatProvider } from "@vendors/shared-types";

export const CHAT_PROVIDERS: { id: ChatProvider; label: string; idHint: string }[] = [
  { id: "tawk", label: "Tawk.to", idHint: "Property ID/Widget ID, e.g. 64f1c2a9e4b0a1b2c3d4e5f6/1h9abc123" },
  { id: "crisp", label: "Crisp", idHint: "Website ID, e.g. 7598bf86-9ebb-46bc-8d61-be8929bbf93d" },
  { id: "tidio", label: "Tidio", idHint: "Public key from Settings > Developer" },
];

const PATTERNS: Record<ChatProvider, RegExp> = {
  tawk: /^[a-f0-9]{24}\/[a-z0-9]{6,16}$/i,
  crisp: /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
  tidio: /^[a-z0-9]{20,40}$/i,
};

export function isValidChatEmbed(value: unknown): value is ChatEmbed {
  if (!value || typeof value !== "object") return false;
  const { provider, id } = value as { provider?: unknown; id?: unknown };
  return (
    typeof provider === "string" &&
    Object.prototype.hasOwnProperty.call(PATTERNS, provider) &&
    typeof id === "string" &&
    PATTERNS[provider as ChatProvider].test(id)
  );
}

export function chatIdLooksValid(provider: ChatProvider, id: string): boolean {
  return PATTERNS[provider].test(id.trim());
}

/** Script URL for a validated embed. IDs are pattern-checked, so they can't break out of the URL. */
export function chatScriptSrc(embed: ChatEmbed): string | null {
  if (!isValidChatEmbed(embed)) return null;
  switch (embed.provider) {
    case "tawk":
      return `https://embed.tawk.to/${embed.id}`;
    case "crisp":
      return "https://client.crisp.chat/l.js";
    case "tidio":
      return `https://code.tidio.co/${embed.id.toLowerCase()}.js`;
  }
}
