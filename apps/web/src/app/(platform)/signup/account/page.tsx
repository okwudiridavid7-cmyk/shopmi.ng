"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useEffect, useState } from "react";
import { Mail, User, Phone } from "lucide-react";
import { useAuthHoneypot } from "@/components/auth-honeypot";
import { apiFetch } from "@/lib/api";
import { safeReturnTo } from "@/lib/auth-redirect";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/input";
import { InputWithIcon } from "@/components/ui/input-with-icon";
import { PasswordStrengthField } from "@/components/ui/password-strength";
import { TextLink } from "@/components/ui/text-link";
import { SettingsCard } from "@/components/ui/settings-card";
import { AuthSplitLayout } from "@/components/auth-split";
import { GoogleContinueButton } from "@/components/google-button";
import { useToast } from "@/components/ui/toast";

function SignupAccountForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { toast } = useToast();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [emailMode, setEmailMode] = useState(false);
  const wantsSeller = searchParams.get("role") === "seller";
  const returnTo = safeReturnTo(searchParams.get("returnTo")) ?? (wantsSeller ? "/seller" : "/buyer");
  const prefillEmail = (searchParams.get("email") ?? "").trim();
  const [password, setPassword] = useState("");
  const honeypot = useAuthHoneypot();

  useEffect(() => {
    if (prefillEmail) setEmailMode(true);
  }, [prefillEmail]);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const form = new FormData(e.currentTarget);
    try {
      await apiFetch("/api/auth/signup", {
        method: "POST",
        body: JSON.stringify({
          name: form.get("name"),
          email: form.get("email"),
          password: password || form.get("password"),
          role: wantsSeller ? "seller" : "buyer",
          phone: form.get("phone") || undefined,
          faxNumber: honeypot.value,
        }),
      });
      toast({ title: "Check your email", description: "We sent a six-digit verification code to finish creating your account.", tone: "success" });
      router.push(`/verify-email?email=${encodeURIComponent(String(form.get("email") ?? ""))}&next=${encodeURIComponent(returnTo)}`);
    } catch (err) {
      const message = err instanceof Error ? err.message : "We couldn’t create your account. Please try again.";
      setError(message);
      toast({ title: "Sign-up failed", description: message, tone: "danger" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthSplitLayout
      title={wantsSeller ? "Create your seller account" : "Create your buyer account"}
      subtitle={wantsSeller ? "Set up your account now. You can build your shop from your dashboard." : "Save favourites, track orders and check out faster."}
    >
      {!emailMode ? (
        <div className="space-y-4">
          <GoogleContinueButton role={wantsSeller ? "seller" : "buyer"} returnTo={returnTo} />
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
            {wantsSeller ? "Creating a buyer account?" : "Selling instead?"}{" "}
            <TextLink href={wantsSeller ? "/signup/account?role=buyer" : "/signup/account?role=seller"}>{wantsSeller ? "Sign up as a buyer" : "Open a shop"}</TextLink>
          </p>
        </div>
      ) : (
        <SettingsCard title="Continue with email">
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
                placeholder="you@example.com"
                name="email"
                type="email"
                required
                autoComplete="email"
                className="h-12"
                defaultValue={prefillEmail}
              />
            </Label>
            <PasswordStrengthField
              value={password}
              onChange={setPassword}
              required
              minLength={8}
              label="New password"
            />
            <Label><span className="text-sm font-medium">Phone <span className="text-muted-foreground">(optional)</span></span><InputWithIcon icon={<Phone />} name="phone" type="tel" autoComplete="tel" placeholder="+234 800 000 0000" className="h-12" /></Label>
            {honeypot.field}
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
            {wantsSeller ? "Creating a buyer account?" : "Selling instead?"}{" "}
            <TextLink href={wantsSeller ? "/signup/account?role=buyer" : "/signup/account?role=seller"}>{wantsSeller ? "Sign up as a buyer" : "Open a shop"}</TextLink>
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
