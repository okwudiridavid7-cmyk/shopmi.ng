"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useState } from "react";
import type { AuthTokensResponse } from "@vendors/shared-types";
import { apiFetch } from "@/lib/api";
import { useAuth } from "@/hooks/use-auth";
import { markWalkthroughPending } from "@/components/walkthrough";
import { Button, Input, Label } from "@/components/ui";
import { CountryStateSelect } from "@/components/country-state-select";
import { AuthSplitLayout } from "@/components/auth-split";
import { GoogleContinueButton } from "@/components/google-button";

function SignupAccountForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { refresh } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const role = searchParams.get("role") === "seller" ? "seller" : "buyer";
  const [countryCode, setCountryCode] = useState("NG");
  const [stateCode, setStateCode] = useState("");
  const [locationLabel, setLocationLabel] = useState("");

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const form = new FormData(e.currentTarget);
    try {
      await apiFetch<AuthTokensResponse>("/api/auth/signup", {
        method: "POST",
        body: JSON.stringify({
          name: form.get("name"),
          email: form.get("email"),
          password: form.get("password"),
          role,
          countryCode: countryCode || undefined,
          stateCode: stateCode || undefined,
          location: locationLabel || undefined,
        }),
      });
      markWalkthroughPending();
      await refresh();
      router.push(role === "seller" ? "/onboarding" : "/");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Signup failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthSplitLayout
      title={role === "seller" ? "Create your seller account" : "Create your buyer account"}
      subtitle="Nigeria is selected by default — change it if you sell or shop elsewhere."
    >
      <form onSubmit={onSubmit} className="space-y-token-4">
        <Label>
          <span>Full name</span>
          <Input
            name="name"
            type="text"
            required
            autoComplete="name"
            placeholder="Ada Okonkwo"
          />
        </Label>
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
            minLength={8}
            autoComplete="new-password"
          />
        </Label>
        <div className="space-y-token-2">
          <p className="text-sm font-medium">Location</p>
          <CountryStateSelect
            idPrefix="signup-geo"
            countryCode={countryCode}
            stateCode={stateCode}
            onChange={(v) => {
              setCountryCode(v.countryCode);
              setStateCode(v.stateCode);
              setLocationLabel(v.label);
            }}
          />
        </div>
        {error && <p className="text-sm text-danger">{error}</p>}
        <Button type="submit" disabled={loading} className="w-full" size="lg">
          {loading ? "Creating…" : "Sign up"}
        </Button>
      </form>
      <GoogleContinueButton
        role={role}
        returnTo={role === "seller" ? "/onboarding" : "/"}
      />
      <p className="text-sm text-muted-foreground">
        Want a different role?{" "}
        <Link href="/signup" className="text-accent hover:underline">
          Choose again
        </Link>
      </p>
    </AuthSplitLayout>
  );
}

export default function SignupAccountPage() {
  return (
    <Suspense fallback={<div className="p-10 text-sm">Loading…</div>}>
      <SignupAccountForm />
    </Suspense>
  );
}
