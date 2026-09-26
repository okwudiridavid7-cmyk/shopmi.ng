"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useEffect, useState } from "react";
import { Lock, Mail } from "lucide-react";
import type { AuthTokensResponse } from "@vendors/shared-types";
import { apiFetch } from "@/lib/api";
import { useAuth } from "@/hooks/use-auth";
import {
  defaultDashboardForRole,
  firstNameFromUser,
  safeReturnTo,
} from "@/lib/auth-redirect";
import { useAuthTransition } from "@/stores/auth-transition";
import { Button, Label } from "@/components/ui";
import { InputWithIcon } from "@/components/ui/input-with-icon";
import { PasswordInput } from "@/components/ui/password-input";
import { TextLink } from "@/components/ui/text-link";
import { SettingsCard } from "@/components/ui/settings-card";
import { AuthSplitLayout } from "@/components/auth-split";
import { GoogleContinueButton } from "@/components/google-button";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, loading: authLoading, refresh } = useAuth();
  const show = useAuthTransition((s) => s.show);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [emailMode, setEmailMode] = useState(false);

  const returnTo =
    safeReturnTo(searchParams.get("returnTo")) ??
    safeReturnTo(searchParams.get("next"));

  // Already signed in → leave /login for the dashboard (or returnTo).
  useEffect(() => {
    if (authLoading || !user) return;
    const dest = returnTo ?? defaultDashboardForRole(user.role);
    router.replace(dest);
  }, [authLoading, user, returnTo, router]);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    show("signing-in");
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
      useAuthTransition.getState().clear();
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
      {!emailMode ? (
        <div className="space-y-4">
          <GoogleContinueButton returnTo={returnTo} />
          <Button
            type="button"
            variant="outline"
            size="lg"
            className="h-12 w-full gap-2"
            onClick={() => setEmailMode(true)}
          >
            <Mail className="h-4 w-4" />
            Continue with email
          </Button>
          <p className="text-center text-sm text-muted-foreground lg:text-left">
            No account? <TextLink href="/signup">Sign up</TextLink>
          </p>
        </div>
      ) : (
        <SettingsCard
          title="Sign in with email"
          description="Enter your email and password to continue."
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
                placeholder="you@example.com"
              />
            </Label>
            <Label>
              <span className="text-sm font-medium">Password</span>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3 top-1/2 z-[1] h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <PasswordInput
                  name="password"
                  required
                  autoComplete="current-password"
                  className="pl-10"
                />
              </div>
            </Label>
            {error && <p className="text-sm text-danger">{error}</p>}
            <Button
              type="submit"
              disabled={loading}
              className="h-12 w-full"
              size="lg"
            >
              {loading ? "Signing in…" : "Log in"}
            </Button>
          </form>
          <p className="text-right text-sm">
            <TextLink href="/forgot-password">Forgot password?</TextLink>
          </p>
          <button
            type="button"
            onClick={() => setEmailMode(false)}
            className="w-full text-center text-sm text-muted-foreground transition hover:text-foreground"
          >
            Other sign-in options
          </button>
          <p className="text-center text-sm text-muted-foreground lg:text-left">
            No account? <TextLink href="/signup">Sign up</TextLink>
          </p>
        </SettingsCard>
      )}
    </AuthSplitLayout>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="p-10 text-center text-sm text-muted-foreground">
          Loading…
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
