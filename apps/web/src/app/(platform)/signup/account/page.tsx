"use client";

import { useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useState } from "react";
import { Mail, User } from "lucide-react";
import type { AuthTokensResponse } from "@vendors/shared-types";
import { apiFetch } from "@/lib/api";
import { useAuth } from "@/hooks/use-auth";
import { markWalkthroughPending } from "@/components/walkthrough";
import { Button, Label } from "@/components/ui";
import { InputWithIcon } from "@/components/ui/input-with-icon";
import { PasswordStrengthField } from "@/components/ui/password-strength";
import { TextLink } from "@/components/ui/text-link";
import { CountryStateSelect } from "@/components/country-state-select";
import { SettingsCard } from "@/components/ui/settings-card";
import { AuthSplitLayout } from "@/components/auth-split";
import { GoogleContinueButton } from "@/components/google-button";

function SignupAccountForm() {
  const searchParams = useSearchParams();
  const { refresh } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [emailMode, setEmailMode] = useState(false);
  const role = searchParams.get("role") === "seller" ? "seller" : "buyer";
  const [countryCode, setCountryCode] = useState("NG");
  const [stateCode, setStateCode] = useState("");
  const [locationLabel, setLocationLabel] = useState("");
  const [password, setPassword] = useState("");

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    if (!stateCode) {
      setError("Select your state / region");
      return;
    }
    setLoading(true);
    const form = new FormData(e.currentTarget);
    try {
      await apiFetch<AuthTokensResponse>("/api/auth/signup", {
        method: "POST",
        body: JSON.stringify({
          name: form.get("name"),
          email: form.get("email"),
          password: password || form.get("password"),
          role,
          countryCode: "NG",
          stateCode: stateCode || undefined,
          location: locationLabel || undefined,
        }),
      });
      markWalkthroughPending();
      await refresh();
      window.location.assign(role === "seller" ? "/onboarding" : "/explore");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Signup failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthSplitLayout
      title={
        role === "seller"
          ? "Create your seller account"
          : "Create your buyer account"
      }
      subtitle="We’ll only need your Nigerian state for now."
    >
      {!emailMode ? (
        <div className="space-y-4">
          <GoogleContinueButton
            role={role}
            returnTo={role === "seller" ? "/onboarding" : "/explore"}
          />
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
            Want a different role?{" "}
            <TextLink href="/signup">Choose again</TextLink>
          </p>
        </div>
      ) : (
        <SettingsCard
          title="Continue with email"
          description="Manage your account details to get started."
        >
          <form onSubmit={onSubmit} className="space-y-5">
            <Label>
              <span className="text-sm font-medium">Full name</span>
              <InputWithIcon
                icon={<User />}
                name="name"
                type="text"
                required
                autoComplete="name"
                placeholder="Ada Okonkwo"
                className="h-12"
              />
            </Label>
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
            <PasswordStrengthField
              value={password}
              onChange={setPassword}
              required
              minLength={8}
              label="New password"
            />
            <div className="space-y-2">
              <p className="text-sm font-medium">Location</p>
              <CountryStateSelect
                idPrefix="signup-geo"
                nigeriaOnly
                countryCode={countryCode}
                stateCode={stateCode}
                required
                onChange={(v) => {
                  setCountryCode(v.countryCode);
                  setStateCode(v.stateCode);
                  setLocationLabel(v.label);
                }}
              />
            </div>
            {error && <p className="text-sm text-danger">{error}</p>}
            <Button
              type="submit"
              disabled={loading}
              className="h-12 w-full"
              size="lg"
            >
              {loading ? "Creating…" : "Sign up"}
            </Button>
          </form>
          <button
            type="button"
            onClick={() => setEmailMode(false)}
            className="mt-4 w-full text-center text-sm text-muted-foreground transition hover:text-foreground"
          >
            Other sign-up options
          </button>
          <p className="mt-3 text-center text-sm text-muted-foreground lg:text-left">
            Want a different role?{" "}
            <TextLink href="/signup">Choose again</TextLink>
          </p>
        </SettingsCard>
      )}
    </AuthSplitLayout>
  );
}

export default function SignupAccountPage() {
  return (
    <Suspense
      fallback={
        <div className="p-10 text-center text-sm text-muted-foreground">
          Loading…
        </div>
      }
    >
      <SignupAccountForm />
    </Suspense>
  );
}
