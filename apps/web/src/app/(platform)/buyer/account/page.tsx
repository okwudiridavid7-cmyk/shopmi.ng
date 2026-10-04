"use client";

import { FormEvent, useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Lock, Mail, Phone, User } from "lucide-react";
import { PageHeader } from "@/components/dashboard/page-header";
import { useComingSoon } from "@/components/coming-soon";
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
import { queryKeys } from "@/lib/query-keys";
import { setAuthUser } from "@/lib/auth-store";

export default function BuyerAccountPage() {
  const { data: user, error: loadError, isLoading } = useBuyerMe();
  const updateProfile = useUpdateBuyerProfile();
  const changePassword = useChangePassword();
  const qc = useQueryClient();
  const comingSoon = useComingSoon();
  const { toast } = useToast();

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [whatsappNumber, setWhatsappNumber] = useState("");
  const [orderEmails, setOrderEmails] = useState(true);
  const [profileErr, setProfileErr] = useState<string | null>(null);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
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
      toast({ title: "Profile saved", tone: "success" });
    } catch (err) {
      setProfileErr(err instanceof Error ? err.message : "Save failed");
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
                <span>Phone</span>
                <InputWithIcon
                  icon={<Phone />}
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+234 xxx xxx xxxx"
                />
              </Label>
              <Label>
                <span>WhatsApp number</span>
                <InputWithIcon
                  icon={<Phone />}
                  value={whatsappNumber}
                  onChange={(e) => setWhatsappNumber(e.target.value)}
                  placeholder="+234 xxx xxx xxxx"
                />
              </Label>
            </div>

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
            <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-border p-4 text-sm transition hover:bg-muted/40">
              <input
                type="checkbox"
                checked={false}
                onChange={() => comingSoon("WhatsApp notifications")}
                className="h-4 w-4 accent-[var(--color-accent)]"
              />
              <span className="font-medium text-foreground">
                WhatsApp order alerts
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
    </div>
  );
}
