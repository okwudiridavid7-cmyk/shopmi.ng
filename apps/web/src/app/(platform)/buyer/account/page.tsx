"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useQueryClient } from "@tanstack/react-query";
import { EmptyState } from "@/components/empty-state";
import { SkeletonLines } from "@/components/skeleton";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Input, Label } from "@/components/ui/input";
import {
  useBuyerMe,
  useChangePassword,
  useUpdateBuyerProfile,
} from "@/hooks/use-buyer";
import { queryKeys } from "@/lib/query-keys";
import { setAuthUser } from "@/lib/auth-store";

export default function BuyerAccountPage() {
  const { data: user, error: loadError, isLoading } = useBuyerMe();
  const updateProfile = useUpdateBuyerProfile();
  const changePassword = useChangePassword();
  const qc = useQueryClient();

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [whatsappNumber, setWhatsappNumber] = useState("");
  const [orderEmails, setOrderEmails] = useState(true);
  const [profileMsg, setProfileMsg] = useState<string | null>(null);
  const [profileErr, setProfileErr] = useState<string | null>(null);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [passwordMsg, setPasswordMsg] = useState<string | null>(null);
  const [passwordErr, setPasswordErr] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      setName(user.name ?? "");
      setPhone(user.phone ?? "");
      setWhatsappNumber(user.whatsappNumber ?? "");
      setOrderEmails(user.notificationPrefs?.orderEmails !== false);
    }
  }, [user]);

  async function saveProfile(e: FormEvent) {
    e.preventDefault();
    setProfileMsg(null);
    setProfileErr(null);
    try {
      const res = await updateProfile.mutateAsync({
        name: name.trim() || null,
        phone: phone || null,
        whatsappNumber: whatsappNumber || null,
        notificationPrefs: { orderEmails },
      });
      setAuthUser(res.user);
      await qc.invalidateQueries({ queryKey: queryKeys.buyer.me });
      setProfileMsg("Profile saved");
    } catch (err) {
      setProfileErr(err instanceof Error ? err.message : "Save failed");
    }
  }

  async function savePassword(e: FormEvent) {
    e.preventDefault();
    setPasswordMsg(null);
    setPasswordErr(null);
    try {
      await changePassword.mutateAsync({ currentPassword, newPassword });
      setCurrentPassword("");
      setNewPassword("");
      setPasswordMsg("Password updated");
    } catch (err) {
      setPasswordErr(
        err instanceof Error ? err.message : "Could not change password"
      );
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

  return (
    <div className="space-y-token-6">
      <div>
        <h1 className="font-display text-2xl text-foreground">
          Account settings
        </h1>
        <p className="mt-token-1 text-sm text-muted-foreground">
          Profile, security, and notification preferences.
        </p>
      </div>

      <form onSubmit={saveProfile} className="space-y-token-6">
        <Card>
          <CardHeader>
            <p className="text-sm font-medium">Profile</p>
          </CardHeader>
          <CardBody className="max-w-md space-y-token-4">
            <Label>
              <span>Name</span>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your name"
              />
            </Label>
            <Label>
              <span>Email</span>
              <Input value={user?.email ?? ""} disabled readOnly />
            </Label>
            <Label>
              <span>Phone</span>
              <Input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+234…"
              />
            </Label>
            <Label>
              <span>WhatsApp number</span>
              <Input
                value={whatsappNumber}
                onChange={(e) => setWhatsappNumber(e.target.value)}
                placeholder="+234…"
              />
            </Label>

            {user?.googleLinked && (
              <p className="rounded-md border border-border bg-muted/50 px-token-3 py-token-2 text-xs text-muted-foreground">
                Google account linked
                {googleOnly ? " · signed in with Google only" : ""}.
              </p>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <p className="text-sm font-medium">Notifications</p>
          </CardHeader>
          <CardBody className="max-w-md space-y-token-4">
            <label className="flex items-start gap-token-3 text-sm">
              <input
                type="checkbox"
                checked={orderEmails}
                onChange={(e) => setOrderEmails(e.target.checked)}
                className="mt-1"
              />
              <span>
                <span className="font-medium text-foreground">
                  Order emails
                </span>
                <span className="mt-token-1 block text-muted-foreground">
                  Receive email updates when your order status changes.
                </span>
              </span>
            </label>
            <label className="flex items-start gap-token-3 text-sm opacity-70">
              <input
                type="checkbox"
                disabled
                checked={false}
                className="mt-1"
              />
              <span>
                <span className="font-medium text-foreground">
                  WhatsApp order alerts
                </span>
                <span className="mt-token-1 block text-muted-foreground">
                  Coming soon — WhatsApp notifications aren’t enabled yet.
                </span>
              </span>
            </label>
          </CardBody>
        </Card>

        <div className="space-y-token-2">
          {profileErr && (
            <p className="text-sm text-red-700 dark:text-red-400">
              {profileErr}
            </p>
          )}
          {profileMsg && (
            <p className="text-sm text-emerald-700 dark:text-emerald-400">
              {profileMsg}
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
            <Link href="/buyer" className="text-accent underline">
              Back to overview
            </Link>
          </p>
        </div>
      </form>

      {!googleOnly && (
        <Card>
          <CardHeader>
            <p className="text-sm font-medium">Password</p>
          </CardHeader>
          <CardBody>
            <form onSubmit={savePassword} className="max-w-md space-y-token-4">
              <Label>
                <span>Current password</span>
                <Input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                />
              </Label>
              <Label>
                <span>New password</span>
                <Input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  minLength={8}
                  autoComplete="new-password"
                />
              </Label>
              {passwordErr && (
                <p className="text-sm text-red-700 dark:text-red-400">
                  {passwordErr}
                </p>
              )}
              {passwordMsg && (
                <p className="text-sm text-emerald-700 dark:text-emerald-400">
                  {passwordMsg}
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
    </div>
  );
}
