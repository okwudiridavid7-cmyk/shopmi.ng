import { z } from "zod";
import type { ChatEmbed, ChatProvider } from "@vendors/shared-types";

export const CHAT_EMBED_SETTING_KEY = "chat_embed";

/** Widget IDs as issued by each provider. Anything else is rejected, so no markup can be smuggled in. */
export const CHAT_EMBED_ID_PATTERNS: Record<ChatProvider, RegExp> = {
  // propertyId/widgetId, e.g. 64f1c2a9e4b0a1b2c3d4e5f6/1h9abc123
  tawk: /^[a-f0-9]{24}\/[a-z0-9]{6,16}$/i,
  // website ID (UUID)
  crisp: /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
  // public key
  tidio: /^[a-z0-9]{20,40}$/i,
};

export const chatEmbedSchema = z
  .object({
    provider: z.enum(["tawk", "crisp", "tidio"]),
    id: z.string().trim().max(64),
  })
  .refine((v) => CHAT_EMBED_ID_PATTERNS[v.provider].test(v.id), {
    message: "That widget ID doesn't match the provider's format.",
    path: ["id"],
  });

export function parseChatEmbed(raw: unknown): ChatEmbed | null {
  let value = raw;
  if (typeof raw === "string") {
    if (!raw.trim()) return null;
    try {
      value = JSON.parse(raw);
    } catch {
      return null;
    }
  }
  const parsed = chatEmbedSchema.safeParse(value);
  return parsed.success ? parsed.data : null;
}
