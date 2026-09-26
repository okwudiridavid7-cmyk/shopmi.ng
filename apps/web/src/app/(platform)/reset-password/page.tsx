"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useState } from "react";
import { apiFetch } from "@/lib/api";
import { useAuth } from "@/hooks/use-auth";
import { Button, Label } from "@/components/ui";
import { PasswordInput } from "@/components/ui/password-input";
import { TextLink } from "@/components/ui/text-link";
import { AuthSplitLayout } from "@/components/auth-split";

function ResetForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { refresh } = useAuth();
  const token = searchParams.get("token") ?? "";
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setErr(null);
    const form = new FormData(e.currentTarget);
    const password = String(form.get("password") ?? "");
    const confirm = String(form.get("confirm") ?? "");
    if (password !== confirm) {
      setErr("Passwords don’t match.");
      setLoading(false);
      return;
    }
    try {
      await apiFetch("/api/auth/reset-password", {
        method: "POST",
        body: JSON.stringify({ token, password }),
      });
      await refresh();
      router.push("/explore");
    } catch (error) {
      setErr(error instanceof Error ? error.message : "Reset failed.");
    } finally {
      setLoading(false);
    }
  }

  if (!token) {
    return (
      <AuthSplitLayout
        title="Invalid link"
        subtitle="This reset URL is missing a token."
      >
        <TextLink href="/forgot-password">Request a new link</TextLink>
      </AuthSplitLayout>
    );
  }

  return (
    <AuthSplitLayout
      title="Choose a new password"
      subtitle="Use at least 8 characters. You’ll be signed in afterward."
    >
      <form onSubmit={onSubmit} className="space-y-5">
        <Label>
          <span className="text-sm font-medium">New password</span>
          <PasswordInput
            name="password"
            required
            minLength={8}
            autoComplete="new-password"
          />
        </Label>
        <Label>
          <span className="text-sm font-medium">Confirm password</span>
          <PasswordInput
            name="confirm"
            required
            minLength={8}
            autoComplete="new-password"
          />
        </Label>
        {err && <p className="text-sm text-danger">{err}</p>}
        <Button type="submit" disabled={loading} className="h-12 w-full" size="lg">
          {loading ? "Saving…" : "Update password"}
        </Button>
      </form>
    </AuthSplitLayout>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="p-10 text-center text-sm text-muted-foreground">
          Loading…
        </div>
      }
    >
      <ResetForm />
    </Suspense>
  );
}
