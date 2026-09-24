"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useState } from "react";
import { apiFetch } from "@/lib/api";
import { useAuth } from "@/hooks/use-auth";
import { Button, Input, Label } from "@/components/ui";
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
      router.push("/");
    } catch (error) {
      setErr(error instanceof Error ? error.message : "Reset failed.");
    } finally {
      setLoading(false);
    }
  }

  if (!token) {
    return (
      <AuthSplitLayout title="Invalid link" subtitle="This reset URL is missing a token.">
        <Link href="/forgot-password" className="text-accent hover:underline">
          Request a new link
        </Link>
      </AuthSplitLayout>
    );
  }

  return (
    <AuthSplitLayout
      title="Choose a new password"
      subtitle="Use at least 8 characters. You’ll be signed in afterward."
    >
      <form onSubmit={onSubmit} className="space-y-token-4">
        <Label>
          <span>New password</span>
          <Input name="password" type="password" required minLength={8} autoComplete="new-password" />
        </Label>
        <Label>
          <span>Confirm password</span>
          <Input name="confirm" type="password" required minLength={8} autoComplete="new-password" />
        </Label>
        {err && <p className="text-sm text-danger">{err}</p>}
        <Button type="submit" disabled={loading} className="w-full" size="lg">
          {loading ? "Saving…" : "Update password"}
        </Button>
      </form>
    </AuthSplitLayout>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div className="p-10 text-sm">Loading…</div>}>
      <ResetForm />
    </Suspense>
  );
}
