"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { EmptyState } from "@/components/empty-state";
import { SkeletonLines } from "@/components/skeleton";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Input, Label, Textarea } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { useToast } from "@/components/ui/toast";
import { useAdminSettings, useSaveAdminSettings } from "@/hooks/use-admin";
import { apiFetch } from "@/lib/api";

/** Spec §3 / UI-4 — known keys with typed controls (not a raw JSON editor). */
const SETTING_META: {
  key: string;
  label: string;
  description: string;
  type: "boolean" | "text" | "email" | "number";
  defaultValue: string;
}[] = [
  {
    key: "app_name",
    label: "Site / project name",
    description:
      "Live site-wide: navbar, emails, legal pages, tab title. Change here — not in .env.",
    type: "text",
    defaultValue: "",
  },
  {
    key: "web_url",
    label: "Production URL",
    description:
      "Public site URL used in emails, legal copy, and share links (e.g. https://shopmi.ng).",
    type: "text",
    defaultValue: "",
  },
  {
    key: "support_email",
    label: "Support email",
    description: "Contact address for sellers and buyers.",
    type: "email",
    defaultValue: "support@vendors.local",
  },
  {
    key: "verification_required",
    label: "Verification required",
    description:
      "When on, unverified shops cannot accept Paystack checkout (enforced in API).",
    type: "boolean",
    defaultValue: "false",
  },
  {
    key: "ai_features_enabled",
    label: "AI features enabled",
    description: "Seller AI description / image tools.",
    type: "boolean",
    defaultValue: "true",
  },
  {
    key: "watermark_default_on",
    label: "Watermark default on",
    description: "Default watermark toggle for new product tooling.",
    type: "boolean",
    defaultValue: "true",
  },
  {
    key: "trial_days",
    label: "Trial days",
    description: "Default trial length for new shops (no redeploy).",
    type: "number",
    defaultValue: "3",
  },
  {
    key: "commission_percent",
    label: "Commission %",
    description: "Platform commission percentage.",
    type: "number",
    defaultValue: "5",
  },
  {
    key: "homepage_banners",
    label: "Homepage banners (JSON)",
    description:
      "Array of { id, imageUrl, title, subtitle, ctaText, ctaUrl, scrollSpeed, active, displayOrder }. Empty uses the default premium banner.",
    type: "text",
    defaultValue: "[]",
  },
  {
    key: "platform_logo_url",
    label: "Wide logo URL",
    description: "Replaces the text logo in the navbar and footer. Upload below or paste a URL.",
    type: "text",
    defaultValue: "",
  },
  {
    key: "platform_logo_square_url",
    label: "Square logo / favicon URL",
    description: "Used as the browser favicon and compact mark.",
    type: "text",
    defaultValue: "",
  },
  {
    key: "whatsapp_url",
    label: "Floating WhatsApp",
    description: "wa.me link or phone number. Shown as a floating button on the marketplace.",
    type: "text",
    defaultValue: "",
  },
  {
    key: "chatbot_html",
    label: "Custom chatbot embed",
    description: "Paste Smartsupp or similar embed HTML/script. Injected on the marketplace.",
    type: "text",
    defaultValue: "",
  },
  {
    key: "homepage_ticker",
    label: "Announcement ticker (JSON)",
    description:
      '{ "enabled": true, "text": "Free delivery this week", "speed": 12, "backgroundColor": "#111111", "textColor": "#ffffff" }',
    type: "text",
    defaultValue: "",
  },
];
export default function AdminSettingsPage() {
  const { data: settings, isLoading, error } = useAdminSettings();
  const save = useSaveAdminSettings();
  const { toast } = useToast();
  const [values, setValues] = useState<Record<string, string>>({});
  const [confirmOpen, setConfirmOpen] = useState(false);

  const byKey = useMemo(() => {
    const map: Record<string, string> = {};
    for (const s of settings ?? []) map[s.key] = s.value;
    return map;
  }, [settings]);

  useEffect(() => {
    const next: Record<string, string> = {};
    for (const meta of SETTING_META) {
      next[meta.key] = byKey[meta.key] ?? meta.defaultValue;
    }
    // Also surface any unknown keys from DB
    for (const [k, v] of Object.entries(byKey)) {
      if (!(k in next)) next[k] = v;
    }
    setValues(next);
  }, [byKey]);

  const unknownKeys = Object.keys(values).filter(
    (k) => !SETTING_META.some((m) => m.key === k)
  );

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    setConfirmOpen(true);
  }

  async function confirmSave() {
    const payload = Object.entries(values).map(([key, value]) => ({
      key,
      value: String(value),
    }));
    try {
      await save.mutateAsync(payload);
      setConfirmOpen(false);
      toast({
        title: "Settings saved",
        description: "Changes take effect on the next API read — no redeploy.",
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
    return (
      <EmptyState
        title="Could not load settings"
        description={
          error instanceof Error ? error.message : "Super admin access required."
        }
      />
    );
  }

  if (isLoading && !settings) {
    return <SkeletonLines count={5} />;
  }

  return (
    <div className="space-y-token-6">
      <div>
        <h1 className="font-display text-2xl text-foreground">
          Platform settings
        </h1>
        <p className="mt-token-1 text-sm text-muted-foreground">
          Site name, logos, and URL are live from this page — no .env change or
          redeploy. Secrets (Paystack, Google, JWT) stay in .env.
        </p>
      </div>

      <form onSubmit={onSubmit} className="space-y-token-4">
        <Card>
          <CardHeader>
            <p className="text-sm font-medium">Site identity & features</p>
          </CardHeader>
          <CardBody className="max-w-xl space-y-token-5">
            {SETTING_META.map((meta) => (
              <div key={meta.key} className="space-y-token-2">
                {meta.type === "boolean" ? (
                  <label className="flex items-start gap-token-3 text-sm">
                    <input
                      type="checkbox"
                      className="mt-1"
                      checked={values[meta.key] === "true"}
                      onChange={(e) =>
                        setValues((v) => ({
                          ...v,
                          [meta.key]: e.target.checked ? "true" : "false",
                        }))
                      }
                    />
                    <span>
                      <span className="font-medium text-foreground">
                        {meta.label}
                      </span>
                      <span className="mt-token-1 block text-muted-foreground">
                        {meta.description}
                      </span>
                    </span>
                  </label>
                ) : meta.key === "homepage_banners" ||
                  meta.key === "homepage_ticker" ||
                  meta.key === "chatbot_html" ? (
                  <Label>
                    <span>{meta.label}</span>
                    <Textarea
                      rows={meta.key === "chatbot_html" ? 6 : 8}
                      className="font-mono text-xs"
                      value={values[meta.key] ?? ""}
                      onChange={(e) =>
                        setValues((v) => ({
                          ...v,
                          [meta.key]: e.target.value,
                        }))
                      }
                    />
                    <span className="text-xs text-muted-foreground">
                      {meta.description}
                    </span>
                  </Label>
                ) : meta.key === "platform_logo_url" ||
                  meta.key === "platform_logo_square_url" ? (
                  <Label>
                    <span>{meta.label}</span>
                    <Input
                      value={values[meta.key] ?? ""}
                      onChange={(e) =>
                        setValues((v) => ({
                          ...v,
                          [meta.key]: e.target.value,
                        }))
                      }
                    />
                    <input
                      type="file"
                      accept="image/*"
                      className="mt-2 text-xs"
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
                          setValues((v) => ({ ...v, [meta.key]: res.url }));
                          toast({
                            title: "Uploaded",
                            description: "Save settings to apply the new logo.",
                            tone: "success",
                          });
                        } catch (err) {
                          toast({
                            title: "Upload failed",
                            description:
                              err instanceof Error ? err.message : "Failed",
                            tone: "danger",
                          });
                        }
                      }}
                    />
                    <span className="text-xs text-muted-foreground">
                      {meta.description}
                    </span>
                  </Label>
                ) : (
                  <Label>
                    <span>{meta.label}</span>
                    <Input
                      type={
                        meta.type === "email"
                          ? "email"
                          : meta.type === "number"
                            ? "number"
                            : "text"
                      }
                      value={values[meta.key] ?? ""}
                      onChange={(e) =>
                        setValues((v) => ({
                          ...v,
                          [meta.key]: e.target.value,
                        }))
                      }
                    />
                    <span className="text-xs text-muted-foreground">
                      {meta.description}
                    </span>
                  </Label>
                )}
              </div>
            ))}

            {unknownKeys.length > 0 && (
              <div className="space-y-token-3 border-t border-border pt-token-4">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Other keys
                </p>
                {unknownKeys.map((key) => (
                  <Label key={key}>
                    <span>{key}</span>
                    <Input
                      value={values[key] ?? ""}
                      onChange={(e) =>
                        setValues((v) => ({ ...v, [key]: e.target.value }))
                      }
                    />
                  </Label>
                ))}
              </div>
            )}

            <Button type="submit" variant="primary" disabled={save.isPending}>
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
        <p>
          These values are read live by checkout, AI tools, onboarding trial
          length, and emails. Confirm you want to update them now.
        </p>
      </Modal>
    </div>
  );
}
