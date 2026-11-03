"use client";

import { FormEvent, useEffect, useState } from "react";
import { Bell, Phone } from "lucide-react";
import { PageHeader } from "@/components/dashboard/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Label } from "@/components/ui/input";
import { InputWithIcon } from "@/components/ui/input-with-icon";
import { useToast } from "@/components/ui/toast";
import { apiFetch } from "@/lib/api";
import { setAuthUser } from "@/lib/auth-store";
import { useAuth } from "@/hooks/use-auth";

export default function SellerNotificationsPage() {
  const { user, refresh } = useAuth();
  const { toast } = useToast();
  const [whatsappOrdersEnabled, setWhatsappOrdersEnabled] = useState(false);
  const [whatsappNumber, setWhatsappNumber] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [otpBusy, setOtpBusy] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [otpCode, setOtpCode] = useState("");
  const [otpPreview, setOtpPreview] = useState<string | null>(null);

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
      setOtpSent(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    }
  }

  async function sendOtp() {
    if (!whatsappNumber.trim()) {
      toast({ title: "Add a WhatsApp number first", tone: "danger" });
      return;
    }
    setOtpBusy(true);
    setOtpPreview(null);
    try {
      const res = await apiFetch<{ preview?: string }>(
        "/api/auth/phone/request-otp",
        {
          method: "POST",
          body: JSON.stringify({ phone: whatsappNumber.trim() }),
        }
      );
      setOtpSent(true);
      setOtpPreview(res.preview ?? null);
      toast({ title: "Code sent on WhatsApp", tone: "success" });
    } catch (err) {
      toast({
        title: "Couldn’t send code",
        description: err instanceof Error ? err.message : undefined,
        tone: "danger",
      });
    } finally {
      setOtpBusy(false);
    }
  }

  async function confirmOtp(e: FormEvent) {
    e.preventDefault();
    setOtpBusy(true);
    try {
      const res = await apiFetch<{ user: NonNullable<typeof user> }>(
        "/api/auth/phone/verify-otp",
        {
          method: "POST",
          body: JSON.stringify({ code: otpCode }),
        }
      );
      setAuthUser(res.user);
      await refresh();
      setOtpSent(false);
      setOtpCode("");
      toast({ title: "Number verified", tone: "success" });
    } catch (err) {
      toast({
        title: "Couldn’t verify",
        description: err instanceof Error ? err.message : undefined,
        tone: "danger",
      });
    } finally {
      setOtpBusy(false);
    }
  }

  const phoneVerified = !!user?.phoneVerifiedAt;

  return (
    <div className="space-y-6">
      <PageHeader title="Notifications" icon={Bell} />

      <Card className="max-w-lg overflow-hidden rounded-2xl">
        <CardHeader className="bg-muted/30">
          <p className="text-sm font-semibold text-foreground">
            WhatsApp alerts
          </p>
        </CardHeader>
        <CardBody>
          <form onSubmit={save} className="space-y-6">
            <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-border bg-card px-4 py-3 transition hover:bg-muted/40">
              <input
                type="checkbox"
                checked={whatsappOrdersEnabled}
                onChange={(e) => setWhatsappOrdersEnabled(e.target.checked)}
                className="h-4 w-4 accent-[var(--color-accent)]"
              />
              <span className="text-sm font-medium text-foreground">
                WhatsApp order alerts
              </span>
            </label>
            <Label>
              <span>Owner WhatsApp number</span>
              <InputWithIcon
                icon={<Phone />}
                value={whatsappNumber}
                onChange={(e) => {
                  setWhatsappNumber(e.target.value);
                  setOtpSent(false);
                }}
                placeholder="0803… or +234…"
              />
            </Label>
            <div className="flex flex-wrap items-center gap-2">
              {phoneVerified ? (
                <p className="text-xs text-emerald-700 dark:text-emerald-400">
                  Number verified for WhatsApp delivery
                </p>
              ) : (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={otpBusy || !whatsappNumber.trim()}
                  onClick={() => void sendOtp()}
                >
                  {otpBusy && !otpSent ? "Sending…" : "Verify via WhatsApp"}
                </Button>
              )}
            </div>
            {otpSent && !phoneVerified ? (
              <div className="space-y-3 rounded-xl border border-border bg-muted/30 p-4">
                <p className="text-sm text-foreground">
                  Enter the 6-digit code from WhatsApp.
                  {otpPreview ? (
                    <span className="mt-1 block text-xs text-muted-foreground">
                      Dev preview: {otpPreview}
                    </span>
                  ) : null}
                </p>
                <Label>
                  <span>Code</span>
                  <InputWithIcon
                    icon={<Phone />}
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value)}
                    inputMode="numeric"
                    placeholder="123456"
                  />
                </Label>
                <Button
                  type="button"
                  variant="primary"
                  size="sm"
                  disabled={otpBusy}
                  onClick={(e) => void confirmOtp(e)}
                >
                  {otpBusy ? "Checking…" : "Confirm code"}
                </Button>
              </div>
            ) : null}
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
