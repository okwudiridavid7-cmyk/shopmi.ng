"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useState } from "react";
import type { AuthTokensResponse } from "@vendors/shared-types";
import { apiFetch } from "@/lib/api";
import { useAuth } from "@/hooks/use-auth";
import {
  defaultDashboardForRole,
  firstNameFromUser,
  safeReturnTo,
} from "@/lib/auth-redirect";
import { useAuthTransition } from "@/stores/auth-transition";
import { Button, Input, Label } from "@/components/ui";
import { AuthSplitLayout } from "@/components/auth-split";
import { GoogleContinueButton } from "@/components/google-button";

function LoginForm() {
  const searchParams = useSearchParams();
  const { refresh } = useAuth();
  const show = useAuthTransition((s) => s.show);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const returnTo =
    safeReturnTo(searchParams.get("returnTo")) ??
    safeReturnTo(searchParams.get("next"));

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const form = new FormData(e.currentTarget);
    try {
      const res = await apiFetch<AuthTokensResponse>("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({
          email: form.get("email"),
          password: form.get("password"),
        }),
      });
      await refresh();
      const dest = returnTo ?? defaultDashboardForRole(res.user.role);
      show("welcome", {
        name: firstNameFromUser(res.user.name, res.user.email),
        nextHref: dest,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthSplitLayout
      title="Log in"
      subtitle="Welcome back — pick up where you left off."
    >
      <form onSubmit={onSubmit} className="space-y-token-4">
        <Label>
          <span>Email</span>
          <Input name="email" type="email" required autoComplete="email" />
        </Label>
        <Label>
          <span>Password</span>
          <Input
            name="password"
            type="password"
            required
            autoComplete="current-password"
          />
        </Label>
        {error && <p className="text-sm text-danger">{error}</p>}
        <Button type="submit" disabled={loading} className="w-full" size="lg">
          {loading ? "Signing in…" : "Log in"}
        </Button>
      </form>
      <p className="text-right text-sm">
        <Link href="/forgot-password" className="text-accent hover:underline">
          Forgot password?
        </Link>
      </p>
      <GoogleContinueButton returnTo={returnTo} />
      <p className="text-sm text-muted-foreground">
        No account?{" "}
        <Link href="/signup" className="text-accent hover:underline">
          Sign up
        </Link>
      </p>
    </AuthSplitLayout>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="p-10 text-sm text-muted-foreground">Loading…</div>}>
      <LoginForm />
    </Suspense>
  );
}
