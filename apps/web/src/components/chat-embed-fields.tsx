"use client";

import type { ChatEmbed, ChatProvider } from "@vendors/shared-types";
import { Input, Label } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { CHAT_PROVIDERS, chatIdLooksValid } from "@/lib/chat-embed";

export type ChatEmbedDraft = { provider: ChatProvider | ""; id: string };

export function draftFromEmbed(embed: ChatEmbed | null | undefined): ChatEmbedDraft {
  return embed ? { provider: embed.provider, id: embed.id } : { provider: "", id: "" };
}

/** null = no widget; undefined = draft is incomplete or invalid. */
export function embedFromDraft(draft: ChatEmbedDraft): ChatEmbed | null | undefined {
  if (!draft.provider) return null;
  const id = draft.id.trim();
  return chatIdLooksValid(draft.provider, id) ? { provider: draft.provider, id } : undefined;
}

export function ChatEmbedFields({
  value,
  onChange,
}: {
  value: ChatEmbedDraft;
  onChange: (next: ChatEmbedDraft) => void;
}) {
  const provider = CHAT_PROVIDERS.find((p) => p.id === value.provider);
  const invalid = Boolean(value.provider && value.id.trim() && embedFromDraft(value) === undefined);

  return (
    <div className="grid gap-3 sm:grid-cols-[minmax(0,12rem)_minmax(0,1fr)]">
      <Label>
        <span>Live chat</span>
        <Select
          value={value.provider}
          onChange={(e) =>
            onChange({ provider: e.target.value as ChatProvider | "", id: value.id })
          }
        >
          <option value="">None</option>
          {CHAT_PROVIDERS.map((p) => (
            <option key={p.id} value={p.id}>
              {p.label}
            </option>
          ))}
        </Select>
      </Label>
      {provider ? (
        <Label>
          <span>Widget ID</span>
          <Input
            value={value.id}
            onChange={(e) => onChange({ provider: value.provider, id: e.target.value })}
            placeholder={provider.idHint}
            aria-invalid={invalid}
            autoComplete="off"
            spellCheck={false}
          />
          <span className={invalid ? "text-xs text-red-600" : "text-xs text-muted-foreground"}>
            {invalid ? "That ID doesn't match the format this provider uses." : provider.idHint}
          </span>
        </Label>
      ) : null}
    </div>
  );
}
