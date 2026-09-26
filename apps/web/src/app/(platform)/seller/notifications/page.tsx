"use client";

import { FormEvent, useEffect, useState } from "react";
import { Bell, Phone } from "lucide-react";
import { PageHeader } from "@/components/dashboard/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Label } from "@/components/ui/input";
import { InputWithIcon } from "@/components/ui/input-with-icon";
import { apiFetch } from "@/lib/api";

export default function SellerNotificationsPage() {
  const [whatsappOrdersEnabled, setWhatsappOrdersEnabled] = useState(false);
  const [whatsappNumber, setWhatsappNumber] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    apiFetch<{
      whatsappOrdersEnabled: boolean;
      whatsappNumber: string | null;
    }>("/api/seller/notifications")
      .then((r) => {
        setWhatsappOrdersEnabled(r.whatsappOrdersEnabled);
        setWhatsappNumber(r.whatsappNumber ?? "");
      })
      .catch((err) =>
        setError(err instanceof Error ? err.message : "Failed to load")
      );
  }, []);

  async function save(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSaved(false);
    try {
      const res = await apiFetch<{
        whatsappOrdersEnabled: boolean;
        whatsappNumber: string | null;
      }>("/api/seller/notifications", {
        method: "PUT",
        body: JSON.stringify({
          whatsappOrdersEnabled,
          whatsappNumber: whatsappNumber || null,
        }),
      });
      setWhatsappOrdersEnabled(res.whatsappOrdersEnabled);
      setWhatsappNumber(res.whatsappNumber ?? "");
      setSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Notifications"
        description="Get a WhatsApp ping when a buyer pays. Requires platform WhatsApp env keys; otherwise messages are logged only."
        icon={Bell}
      />

      <Card className="max-w-lg overflow-hidden rounded-2xl">
        <CardHeader className="bg-muted/30">
          <p className="text-sm font-semibold text-foreground">
            WhatsApp alerts
          </p>
        </CardHeader>
        <CardBody>
          <form onSubmit={save} className="space-y-6">
            <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-border bg-card px-4 py-3 transition hover:bg-muted/40">
              <input
                type="checkbox"
                checked={whatsappOrdersEnabled}
                onChange={(e) => setWhatsappOrdersEnabled(e.target.checked)}
                className="mt-1 h-4 w-4 accent-[var(--color-accent)]"
              />
              <span>
                <span className="block text-sm font-medium text-foreground">
                  WhatsApp order alerts
                </span>
                <span className="text-xs text-muted-foreground">
                  Notify the shop owner number on paid orders
                </span>
              </span>
            </label>
            <Label>
              <span>Owner WhatsApp number</span>
              <InputWithIcon
                icon={<Phone />}
                value={whatsappNumber}
                onChange={(e) => setWhatsappNumber(e.target.value)}
                placeholder="+234…"
              />
            </Label>
            {error && (
              <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
            )}
            {saved && (
              <p className="text-sm text-emerald-700 dark:text-emerald-400">
                Saved
              </p>
            )}
            <Button type="submit" variant="primary">
              Save
            </Button>
          </form>
        </CardBody>
      </Card>
    </div>
  );
}
