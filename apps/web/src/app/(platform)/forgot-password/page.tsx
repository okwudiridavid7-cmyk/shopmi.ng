"use client";

import { FormEvent, useState } from "react";
import { Mail } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { Button, Label } from "@/components/ui";
import { InputWithIcon } from "@/components/ui/input-with-icon";
import { TextLink } from "@/components/ui/text-link";
import { AuthSplitLayout } from "@/components/auth-split";

export default function ForgotPasswordPage() {
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setErr(null);
    setMsg(null);
    const form = new FormData(e.currentTarget);
    try {
      const res = await apiFetch<{ message: string }>(
        "/api/auth/forgot-password",
        {
          method: "POST",
          body: JSON.stringify({ email: form.get("email") }),
        }
      );
      setMsg(res.message);
    } catch (error) {
      setErr(
        error instanceof Error ? error.message : "Couldn’t send that email."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthSplitLayout
      title="Forgot password"
      subtitle="Enter the email on your account. If it matches, we’ll send a reset link."
    >
      <form onSubmit={onSubmit} className="space-y-5">
        <Label>
          <span className="text-sm font-medium">Email</span>
          <InputWithIcon
            icon={<Mail />}
            name="email"
            type="email"
            required
            autoComplete="email"
            className="h-12"
          />
        </Label>
        {err && <p className="text-sm text-danger">{err}</p>}
        {msg && (
          <p className="text-sm text-emerald-700 dark:text-emerald-400">{msg}</p>
        )}
        <Button type="submit" disabled={loading} className="h-12 w-full" size="lg">
          {loading ? "Sending…" : "Send reset link"}
        </Button>
      </form>
      <p className="text-center text-sm text-muted-foreground lg:text-left">
        <TextLink href="/login" arrow="left" tone="muted">
          Back to log in
        </TextLink>
      </p>
    </AuthSplitLayout>
  );
}
