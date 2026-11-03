"use client";

import { FormEvent, useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Download, Lock, Mail, Phone, Trash2, User } from "lucide-react";
import { PageHeader } from "@/components/dashboard/page-header";
import { EmptyState } from "@/components/empty-state";
import { SkeletonLines } from "@/components/skeleton";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Label } from "@/components/ui/input";
import { InputWithIcon } from "@/components/ui/input-with-icon";
import { TextLink } from "@/components/ui/text-link";
import { useToast } from "@/components/ui/toast";
import {
  useBuyerMe,
  useChangePassword,
  useUpdateBuyerProfile,
} from "@/hooks/use-buyer";
import { apiFetch, apiUrl } from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";
import { setAuthUser } from "@/lib/auth-store";

export default function BuyerAccountPage() {
  const { data: user, error: loadError, isLoading, refetch } = useBuyerMe();
  const updateProfile = useUpdateBuyerProfile();
  const changePassword = useChangePassword();
  const qc = useQueryClient();
  const { toast } = useToast();

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [whatsappNumber, setWhatsappNumber] = useState("");
  const [orderEmails, setOrderEmails] = useState(true);
  const [whatsappOrders, setWhatsappOrders] = useState(false);
  const [profileErr, setProfileErr] = useState<string | null>(null);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [passwordErr, setPasswordErr] = useState<string | null>(null);
  const [resendBusy, setResendBusy] = useState(false);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [otpBusy, setOtpBusy] = useState(false);
  const [otpCode, setOtpCode] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [otpPreview, setOtpPreview] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      setName(user.name ?? "");
      setPhone(user.phone ?? "");
      setWhatsappNumber(user.whatsappNumber ?? "");
      setOrderEmails(user.notificationPrefs?.orderEmails !== false);
      setWhatsappOrders(!!user.notificationPrefs?.whatsappOrders);
    }
  }, [user]);

  async function saveProfile(e: FormEvent) {
    e.preventDefault();
    setProfileErr(null);
    try {
      const res = await updateProfile.mutateAsync({
        name: name.trim() || null,
        phone: phone || null,
        whatsappNumber: whatsappNumber || phone || null,
        notificationPrefs: { orderEmails, whatsappOrders },
      });
      setAuthUser(res.user);
      await qc.invalidateQueries({ queryKey: queryKeys.buyer.me });
      toast({ title: "Profile saved", tone: "success" });
    } catch (err) {
      setProfileErr(err instanceof Error ? err.message : "Save failed");
    }
  }

  async function sendPhoneOtp() {
    const number = (whatsappNumber || phone).trim();
    if (!number) {
      toast({ title: "Add a phone number first", tone: "danger" });
      return;
    }
    setOtpBusy(true);
    setOtpPreview(null);
    try {
      const res = await apiFetch<{
        ok: boolean;
        expiresAt: string;
        preview?: string;
      }>("/api/auth/phone/request-otp", {
        method: "POST",
        body: JSON.stringify({ phone: number }),
      });
      setOtpSent(true);
      setOtpPreview(res.preview ?? null);
      await refetch();
      toast({
        title: "Code sent on WhatsApp",
        description: "Enter the 6-digit code to verify your number.",
        tone: "success",
      });
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

  async function confirmPhoneOtp(e: FormEvent) {
    e.preventDefault();
    setOtpBusy(true);
    try {
      const res = await apiFetch<{ ok: boolean; user: typeof user }>(
        "/api/auth/phone/verify-otp",
        {
          method: "POST",
          body: JSON.stringify({ code: otpCode }),
        }
      );
      if (res.user) setAuthUser(res.user);
      setOtpSent(false);
      setOtpCode("");
      setOtpPreview(null);
      await qc.invalidateQueries({ queryKey: queryKeys.buyer.me });
      toast({ title: "Phone verified", tone: "success" });
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

  async function savePassword(e: FormEvent) {
    e.preventDefault();
    setPasswordErr(null);
    try {
      await changePassword.mutateAsync({ currentPassword, newPassword });
      setCurrentPassword("");
      setNewPassword("");
      toast({ title: "Password updated", tone: "success" });
    } catch (err) {
      setPasswordErr(
        err instanceof Error ? err.message : "Could not change password"
      );
    }
  }

  async function resendVerification() {
    setResendBusy(true);
    try {
      await apiFetch("/api/auth/resend-verification", { method: "POST" });
      toast({ title: "Verification email sent", tone: "success" });
    } catch (err) {
      toast({
        title: "Couldn’t resend",
        description: err instanceof Error ? err.message : undefined,
        tone: "danger",
      });
    } finally {
      setResendBusy(false);
    }
  }

  async function requestDeletion() {
    if (
      !window.confirm(
        "Request permanent deletion of your account? We’ll email support and process it under our privacy policy."
      )
    ) {
      return;
    }
    setDeleteBusy(true);
    try {
      const res = await apiFetch<{
        user?: { deletionRequestAt?: string | null };
        alreadyRequested?: boolean;
      }>("/api/buyer/me/deletion-request", { method: "POST" });
      await qc.invalidateQueries({ queryKey: queryKeys.buyer.me });
      await refetch();
      toast({
        title: res.alreadyRequested
          ? "Deletion already requested"
          : "Deletion requested",
        description: "We’ll process this and follow up by email.",
        tone: "success",
      });
    } catch (err) {
      toast({
        title: "Request failed",
        description: err instanceof Error ? err.message : undefined,
        tone: "danger",
      });
    } finally {
      setDeleteBusy(false);
    }
  }

  if (loadError && !user) {
    return (
      <EmptyState
        title="Sign in required"
        description={
          loadError instanceof Error
            ? loadError.message
            : "Log in to manage your account."
        }
        actionLabel="Log in"
        actionHref="/login"
      />
    );
  }

  if (isLoading && !user) {
    return <SkeletonLines count={4} />;
  }

  const googleOnly = !!user?.googleLinked && !user?.hasPassword;
  const emailVerified = !!user?.emailVerifiedAt;
  const phoneVerified = !!user?.phoneVerifiedAt;
  const deletionRequested = !!user?.deletionRequestAt;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Account settings"
        description="Profile, security, and notification preferences."
        icon={User}
      />

      <form onSubmit={saveProfile} className="space-y-6">
        <Card className="overflow-hidden rounded-2xl">
          <CardHeader className="bg-muted/30">
            <p className="text-sm font-semibold text-foreground">Profile</p>
          </CardHeader>
          <CardBody className="space-y-6">
            <div className="grid max-w-2xl gap-5 sm:grid-cols-2">
              <Label>
                <span>Name</span>
                <InputWithIcon
                  icon={<User />}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your name"
                />
              </Label>
              <Label>
                <span>Email</span>
                <InputWithIcon
                  icon={<Mail />}
                  value={user?.email ?? ""}
                  disabled
                  readOnly
                />
              </Label>
              <Label>
                <span>Phone / WhatsApp</span>
                <InputWithIcon
                  icon={<Phone />}
                  value={whatsappNumber || phone}
                  onChange={(e) => {
                    setPhone(e.target.value);
                    setWhatsappNumber(e.target.value);
                    setOtpSent(false);
                  }}
                  placeholder="0803… or +234…"
                />
              </Label>
              <div className="flex flex-col justify-end gap-2">
                {phoneVerified ? (
                  <p className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs text-foreground">
                    Mobile verified
                    {user?.phoneVerifiedAt
                      ? ` · ${new Date(user.phoneVerifiedAt).toLocaleDateString()}`
                      : ""}
                  </p>
                ) : (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={otpBusy || !(whatsappNumber || phone).trim()}
                    onClick={() => void sendPhoneOtp()}
                  >
                    {otpBusy && !otpSent
                      ? "Sending…"
                      : "Verify via WhatsApp"}
                  </Button>
                )}
              </div>
            </div>

            {otpSent && !phoneVerified ? (
              <form
                onSubmit={confirmPhoneOtp}
                className="max-w-md space-y-3 rounded-xl border border-border bg-muted/30 p-4"
              >
                <p className="text-sm text-foreground">
                  Enter the 6-digit code we sent on WhatsApp.
                  {otpPreview ? (
                    <span className="mt-1 block text-xs text-muted-foreground">
                      Dev preview code: {otpPreview}
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
                    autoComplete="one-time-code"
                    placeholder="123456"
                    required
                    minLength={6}
                    maxLength={8}
                  />
                </Label>
                <div className="flex flex-wrap gap-2">
                  <Button type="submit" variant="primary" size="sm" disabled={otpBusy}>
                    {otpBusy ? "Checking…" : "Confirm code"}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    disabled={otpBusy}
                    onClick={() => void sendPhoneOtp()}
                  >
                    Resend
                  </Button>
                </div>
              </form>
            ) : null}

            {!emailVerified && (
              <div className="flex max-w-2xl flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm">
                <p className="text-foreground">
                  Your email isn’t verified yet. Check your inbox, or resend the
                  link.
                </p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={resendBusy}
                  onClick={() => void resendVerification()}
                >
                  {resendBusy ? "Sending…" : "Resend verification"}
                </Button>
              </div>
            )}

            {emailVerified && (
              <p className="max-w-2xl text-xs text-muted-foreground">
                Email verified
                {user?.emailVerifiedAt
                  ? ` · ${new Date(user.emailVerifiedAt).toLocaleDateString()}`
                  : ""}
                .
              </p>
            )}

            {user?.googleLinked && (
              <p className="max-w-2xl rounded-xl border border-border bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
                Google account linked
                {googleOnly ? " · signed in with Google only" : ""}.
              </p>
            )}
          </CardBody>
        </Card>

        <Card className="overflow-hidden rounded-2xl">
          <CardHeader className="bg-muted/30">
            <p className="text-sm font-semibold text-foreground">
              Notifications
            </p>
          </CardHeader>
          <CardBody className="max-w-md space-y-4">
            <label className="flex items-center gap-3 rounded-xl border border-border p-4 text-sm transition hover:bg-muted/40">
              <input
                type="checkbox"
                checked={orderEmails}
                onChange={(e) => setOrderEmails(e.target.checked)}
                className="h-4 w-4 accent-[var(--color-accent)]"
              />
              <span className="font-medium text-foreground">Order emails</span>
            </label>
            <label className="flex items-center gap-3 rounded-xl border border-border p-4 text-sm transition hover:bg-muted/40">
              <input
                type="checkbox"
                checked={whatsappOrders}
                onChange={(e) => setWhatsappOrders(e.target.checked)}
                className="h-4 w-4 accent-[var(--color-accent)]"
              />
              <span className="min-w-0">
                <span className="font-medium text-foreground">
                  WhatsApp order updates
                </span>
                <span className="mt-0.5 block text-xs text-muted-foreground">
                  {phoneVerified
                    ? "Payment, shipping, and refund notices on WhatsApp."
                    : "Verify your phone first to receive WhatsApp updates."}
                </span>
              </span>
            </label>
          </CardBody>
        </Card>

        <div className="space-y-2">
          {profileErr && (
            <p className="text-sm text-red-700 dark:text-red-400">
              {profileErr}
            </p>
          )}
          <Button
            type="submit"
            disabled={updateProfile.isPending}
            variant="primary"
          >
            {updateProfile.isPending ? "Saving…" : "Save profile"}
          </Button>
          <p className="text-xs text-muted-foreground">
            <TextLink href="/buyer" arrow="left" tone="muted">
              Back to overview
            </TextLink>
          </p>
        </div>
      </form>

      {!googleOnly && (
        <Card className="overflow-hidden rounded-2xl">
          <CardHeader className="bg-muted/30">
            <p className="text-sm font-semibold text-foreground">Password</p>
          </CardHeader>
          <CardBody>
            <form onSubmit={savePassword} className="max-w-md space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <Label>
                  <span>Current password</span>
                  <InputWithIcon
                    icon={<Lock />}
                    type="password"
                    placeholder="Your current password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    required
                    autoComplete="current-password"
                  />
                </Label>
                <Label>
                  <span>New password</span>
                  <InputWithIcon
                    icon={<Lock />}
                    type="password"
                    placeholder="At least 8 characters"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    minLength={8}
                    autoComplete="new-password"
                  />
                </Label>
              </div>
              {passwordErr && (
                <p className="text-sm text-red-700 dark:text-red-400">
                  {passwordErr}
                </p>
              )}
              <Button
                type="submit"
                disabled={changePassword.isPending}
                variant="outline"
              >
                {changePassword.isPending ? "Updating…" : "Change password"}
              </Button>
            </form>
          </CardBody>
        </Card>
      )}

      <Card className="overflow-hidden rounded-2xl">
        <CardHeader className="bg-muted/30">
          <p className="text-sm font-semibold text-foreground">Privacy</p>
        </CardHeader>
        <CardBody className="space-y-4">
          <p className="max-w-2xl text-sm text-muted-foreground">
            Download a JSON copy of your profile, orders, favourites, and shops,
            or request account deletion under our privacy policy.
          </p>
          <div className="flex flex-wrap gap-3">
            <a href={apiUrl("/api/buyer/me/export")}>
              <Button type="button" variant="outline" size="sm">
                <Download className="mr-1.5 h-3.5 w-3.5" />
                Download my data
              </Button>
            </a>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={deleteBusy || deletionRequested}
              onClick={() => void requestDeletion()}
            >
              <Trash2 className="mr-1.5 h-3.5 w-3.5" />
              {deletionRequested
                ? "Deletion requested"
                : deleteBusy
                  ? "Submitting…"
                  : "Request account deletion"}
            </Button>
          </div>
          {deletionRequested && user?.deletionRequestAt ? (
            <p className="text-xs text-muted-foreground">
              Requested{" "}
              {new Date(user.deletionRequestAt).toLocaleString()}. Support will
              follow up by email.
            </p>
          ) : null}
        </CardBody>
      </Card>
    </div>
  );
}
