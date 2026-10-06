"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import type { LucideIcon } from "lucide-react";
import {
  Bot,
  CreditCard,
  Droplets,
  Globe,
  Image,
  Link2,
  Mail,
  MessageCircle,
  Percent,
  Save,
  Sparkles,
  Timer,
  Wrench,
} from "lucide-react";
import { PageHeader } from "@/components/dashboard/page-header";
import { QueryErrorState } from "@/components/empty-state";
import { SkeletonLines } from "@/components/skeleton";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Input, Label, Textarea } from "@/components/ui/input";
import { InputWithIcon } from "@/components/ui/input-with-icon";
import { Modal } from "@/components/ui/modal";
import { useToast } from "@/components/ui/toast";
import { useAdminSettings, useSaveAdminSettings } from "@/hooks/use-admin";
import { apiFetch } from "@/lib/api";
import { PALETTE_SETTING_KEY } from "@/lib/palette";
import { isValidChatEmbed } from "@/lib/chat-embed";
import {
  ChatEmbedFields,
  draftFromEmbed,
  embedFromDraft,
  type ChatEmbedDraft,
} from "@/components/chat-embed-fields";

const CHAT_EMBED_KEY = "chat_embed";

/** Keys with their own editor (or retired), kept out of the generic "Other keys" list. */
const MANAGED_ELSEWHERE = new Set([PALETTE_SETTING_KEY, CHAT_EMBED_KEY, "chatbot_html"]);

function parseEmbedSetting(raw: string | undefined): ChatEmbedDraft {
  if (!raw) return { provider: "", id: "" };
  try {
    const parsed: unknown = JSON.parse(raw);
    return draftFromEmbed(isValidChatEmbed(parsed) ? parsed : null);
  } catch {
    return { provider: "", id: "" };
  }
}

const SETTING_META: {
  key: string;
  label: string;
  description?: string;
  placeholder?: string;
  type: "boolean" | "text" | "email" | "number";
  defaultValue: string;
  icon: LucideIcon;
  wide?: boolean;
}[] = [
  {
    key: "app_name",
    placeholder: "Shopmi.ng",
    label: "Site / project name",
    type: "text",
    defaultValue: "",
    icon: Sparkles,
  },
  {
    key: "web_url",
    placeholder: "https://shopmi.ng",
    label: "Production URL",
    description: "e.g. https://shopmi.ng",
    type: "text",
    defaultValue: "",
    icon: Globe,
  },
  {
    key: "support_email",
    placeholder: "support@shopmi.ng",
    label: "Support email",
    type: "email",
    defaultValue: "support@shopmi.ng",
    icon: Mail,
  },
  {
    key: "trial_days",
    placeholder: "3",
    label: "Trial days",
    type: "number",
    defaultValue: "3",
    icon: Timer,
  },
  {
    key: "commission_percent",
    placeholder: "5",
    label: "Commission %",
    description: "Platform fee on each order.",
    type: "number",
    defaultValue: "5",
    icon: Percent,
  },
  {
    key: "billing_enabled",
    label: "Billing / pricing enabled",
    description: "Shows the pricing page and plan links.",
    type: "boolean",
    defaultValue: "true",
    icon: CreditCard,
  },
  {
    key: "verification_required",
    label: "Verification required",
    description: "Only verified shops can accept payments.",
    type: "boolean",
    defaultValue: "false",
    icon: Wrench,
  },
  {
    key: "email_verification_required",
    label: "Email verification required",
    description: "Buyers must verify their email before checkout.",
    type: "boolean",
    defaultValue: "false",
    icon: Mail,
  },
  {
    key: "ai_features_enabled",
    label: "AI features enabled",
    type: "boolean",
    defaultValue: "true",
    icon: Bot,
  },
  {
    key: "watermark_default_on",
    label: "Watermark default on",
    description: "Watermark new product images by default.",
    type: "boolean",
    defaultValue: "true",
    icon: Droplets,
  },
  {
    key: "platform_logo_url",
    placeholder: "https://cdn.example.com/logo.png",
    label: "Wide logo URL",
    type: "text",
    defaultValue: "",
    icon: Image,
  },
  {
    key: "platform_logo_square_url",
    placeholder: "https://cdn.example.com/icon.png",
    label: "Square logo / favicon URL",
    type: "text",
    defaultValue: "",
    icon: Image,
  },
  {
    key: "whatsapp_url",
    placeholder: "https://wa.me/2348012345678",
    label: "Floating WhatsApp",
    description: "wa.me link or phone number",
    type: "text",
    defaultValue: "",
    icon: MessageCircle,
  },
  {
    key: "homepage_banners",
    placeholder: "[{\"id\": \"spring\", \"imageUrl\": \"https://...\", \"title\": \"New season\", \"ctaText\": \"Shop now\", \"ctaUrl\": \"/explore\", \"active\": true}]",
    label: "Homepage banners (JSON)",
    description:
      "Array of { id, imageUrl, title, subtitle, ctaText, ctaUrl, scrollSpeed, active, displayOrder }",
    type: "text",
    defaultValue: "[]",
    icon: Image,
    wide: true,
  },
  {
    key: "homepage_ticker",
    placeholder: "{\"text\": \"Free delivery this week\", \"speed\": 12, \"backgroundColor\": \"#111111\", \"textColor\": \"#ffffff\"}",
    label: "Announcement ticker (JSON)",
    type: "text",
    defaultValue: "",
    icon: Link2,
    wide: true,
  },
];

export default function AdminSettingsPage() {
  const { data: settings, isLoading, error } = useAdminSettings();
  const save = useSaveAdminSettings();
  const { toast } = useToast();
  const [values, setValues] = useState<Record<string, string>>({});
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [chatDraft, setChatDraft] = useState<ChatEmbedDraft>({ provider: "", id: "" });

  useEffect(() => {
    if (!settings) return;
    const next: Record<string, string> = {};
    for (const meta of SETTING_META) {
      const found = settings.find((s) => s.key === meta.key);
      next[meta.key] = found?.value ?? meta.defaultValue;
    }
    for (const s of settings) {
      if (!(s.key in next) && !MANAGED_ELSEWHERE.has(s.key)) next[s.key] = s.value;
    }
    setValues(next);
    setChatDraft(parseEmbedSetting(settings.find((s) => s.key === CHAT_EMBED_KEY)?.value));
  }, [settings]);

  const known = useMemo(() => new Set(SETTING_META.map((m) => m.key)), []);
  const unknownKeys = useMemo(
    () => Object.keys(values).filter((k) => !known.has(k)),
    [values, known]
  );

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (embedFromDraft(chatDraft) === undefined) {
      toast({ title: "Check the live chat widget ID", tone: "danger" });
      return;
    }
    setConfirmOpen(true);
  }

  async function confirmSave() {
    try {
      const embed = embedFromDraft(chatDraft);
      await save.mutateAsync([
        ...Object.entries(values).map(([key, value]) => ({ key, value })),
        { key: CHAT_EMBED_KEY, value: embed ? JSON.stringify(embed) : "" },
      ]);
      setConfirmOpen(false);
      toast({
        title: "Settings saved",
        tone: "success",
      });
    } catch (err) {
      toast({
        title: "Save failed",
        description: err instanceof Error ? err.message : "Failed",
        tone: "danger",
      });
    }
  }

  if (error && !settings) {
    return <QueryErrorState error={error} sellerHomeHref="/admin" />;
  }

  if (isLoading && !settings) {
    return <SkeletonLines count={5} />;
  }

  const booleans = SETTING_META.filter((m) => m.type === "boolean");
  const fields = SETTING_META.filter((m) => m.type !== "boolean" && !m.wide);
  const wide = SETTING_META.filter((m) => m.wide);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Platform settings"
        icon={Wrench}
      />

      <form onSubmit={onSubmit} className="space-y-6">
        <Card className="overflow-hidden rounded-2xl">
          <CardHeader className="bg-muted/30">
            <p className="text-sm font-semibold text-foreground">
              Site identity & features
            </p>
          </CardHeader>
          <CardBody className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-2">
              {booleans.map((meta) => {
                const Icon = meta.icon;
                return (
                  <label
                    key={meta.key}
                    className="flex cursor-pointer items-start gap-3 rounded-xl border border-border bg-card p-4 transition hover:bg-muted/40"
                  >
                    <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border bg-background text-muted-foreground">
                      <Icon className="h-4 w-4" aria-hidden />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center justify-between gap-2">
                        <span className="text-sm font-medium text-foreground">
                          {meta.label}
                        </span>
                        <input
                          type="checkbox"
                          className="h-4 w-4 accent-[var(--color-accent)]"
                          checked={values[meta.key] === "true"}
                          onChange={(e) =>
                            setValues((v) => ({
                              ...v,
                              [meta.key]: e.target.checked ? "true" : "false",
                            }))
                          }
                        />
                      </span>
                      {meta.description ? (
                        <span className="mt-1 block text-xs text-muted-foreground">
                          {meta.description}
                        </span>
                      ) : null}
                    </span>
                  </label>
                );
              })}
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              {fields.map((meta) => {
                const Icon = meta.icon;
                const isLogo =
                  meta.key === "platform_logo_url" ||
                  meta.key === "platform_logo_square_url";
                return (
                  <div key={meta.key} className="space-y-2">
                    <Label>
                      <span className="font-medium">{meta.label}</span>
                      <InputWithIcon
                        icon={<Icon />}
                        type={
                          meta.type === "email"
                            ? "email"
                            : meta.type === "number"
                              ? "number"
                              : "text"
                        }
                        placeholder={meta.placeholder}
                        value={values[meta.key] ?? ""}
                        onChange={(e) =>
                          setValues((v) => ({
                            ...v,
                            [meta.key]: e.target.value,
                          }))
                        }
                      />
                      {isLogo ? (
                        <input
                          type="file"
                          accept="image/*"
                          className="mt-2 block w-full text-xs text-muted-foreground file:mr-3 file:rounded-md file:border-0 file:bg-muted file:px-3 file:py-1.5 file:text-xs file:font-medium"
                          onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (!file) return;
                            try {
                              const body = new FormData();
                              body.append("file", file);
                              const res = await apiFetch<{ url: string }>(
                                "/api/admin/uploads",
                                { method: "POST", body }
                              );
                              setValues((v) => ({
                                ...v,
                                [meta.key]: res.url,
                              }));
                              toast({
                                title: "Uploaded",
                                description:
                                  "Save settings to apply the new logo.",
                                tone: "success",
                              });
                            } catch (err) {
                              toast({
                                title: "Upload failed",
                                description:
                                  err instanceof Error
                                    ? err.message
                                    : "Failed",
                                tone: "danger",
                              });
                            }
                          }}
                        />
                      ) : null}
                      {meta.description ? (
                        <span className="text-xs text-muted-foreground">
                          {meta.description}
                        </span>
                      ) : null}
                    </Label>
                  </div>
                );
              })}
            </div>

            <div className="space-y-5">
              {wide.map((meta) => {
                const Icon = meta.icon;
                return (
                  <Label key={meta.key}>
                    <span className="inline-flex items-center gap-2 font-medium">
                      <Icon
                        className="h-3.5 w-3.5 text-muted-foreground"
                        aria-hidden
                      />
                      {meta.label}
                    </span>
                    <Textarea
                      rows={8}
                      className="font-mono text-xs"
                      placeholder={meta.placeholder}
                      value={values[meta.key] ?? ""}
                      onChange={(e) =>
                        setValues((v) => ({
                          ...v,
                          [meta.key]: e.target.value,
                        }))
                      }
                    />
                    {meta.description ? (
                      <span className="text-xs text-muted-foreground">
                        {meta.description}
                      </span>
                    ) : null}
                  </Label>
                );
              })}
            </div>

            <ChatEmbedFields value={chatDraft} onChange={setChatDraft} />

            {unknownKeys.length > 0 && (
              <div className="space-y-3 border-t border-border pt-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Other keys
                </p>
                <div className="grid gap-4 sm:grid-cols-2">
                  {unknownKeys.map((key) => (
                    <Label key={key}>
                      <span>{key}</span>
                      <Input
                        placeholder="Value"
                        value={values[key] ?? ""}
                        onChange={(e) =>
                          setValues((v) => ({ ...v, [key]: e.target.value }))
                        }
                      />
                    </Label>
                  ))}
                </div>
              </div>
            )}

            <Button type="submit" variant="primary" disabled={save.isPending}>
              <Save className="h-4 w-4" aria-hidden />
              Save settings
            </Button>
          </CardBody>
        </Card>
      </form>

      <Modal
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        title="Save platform settings?"
        footer={
          <>
            <Button variant="ghost" onClick={() => setConfirmOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              disabled={save.isPending}
              onClick={() => void confirmSave()}
            >
              {save.isPending ? "Saving…" : "Confirm save"}
            </Button>
          </>
        }
      >
        <p>These changes take effect immediately.</p>
      </Modal>
    </div>
  );
}
