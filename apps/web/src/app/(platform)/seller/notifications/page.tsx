"use client";

import { FormEvent, useEffect, useState } from "react";
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
    <form onSubmit={save} className="max-w-md space-y-4">
      <p className="text-sm text-muted-foreground">
        Get a WhatsApp ping when a buyer pays. Requires platform WhatsApp env
        keys; otherwise messages are logged only.
      </p>
      <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-border bg-card px-4 py-3">
        <input
          type="checkbox"
          checked={whatsappOrdersEnabled}
          onChange={(e) => setWhatsappOrdersEnabled(e.target.checked)}
          className="mt-1"
        />
        <span>
          <span className="block text-sm font-medium">
            WhatsApp order alerts
          </span>
          <span className="text-xs text-muted-foreground">
            Notify the shop owner number on paid orders
          </span>
        </span>
      </label>
      <label className="block space-y-1 text-sm">
        <span>Owner WhatsApp number</span>
        <input
          value={whatsappNumber}
          onChange={(e) => setWhatsappNumber(e.target.value)}
          placeholder="+234…"
          className="w-full rounded-md border border-border bg-card px-3 py-2"
        />
      </label>
      {error && (
        <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
      )}
      {saved && (
        <p className="text-sm text-emerald-700 dark:text-emerald-400">Saved</p>
      )}
      <button
        type="submit"
        className="rounded-md bg-accent px-4 py-2 text-sm text-accent-foreground"
      >
        Save
      </button>
    </form>
  );
}
