"use client";

import Link from "next/link";
import { ShoppingBag, Store } from "lucide-react";
import { AuthSplitLayout } from "@/components/auth-split";
import { useAppName } from "@/hooks/use-branding";

export default function SignupRolePage() {
  const appName = useAppName();
  return (
    <AuthSplitLayout
      title="I want to be a…"
      subtitle={`Choose how you’ll use ${appName}. You can always open a shop later from your account.`}
    >
      <div className="grid gap-token-4">
        <Link
          href="/signup/account?role=buyer"
          className="rounded-xl border border-border bg-card p-token-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-accent hover:shadow-md"
        >
          <ShoppingBag className="mb-3 h-8 w-8 text-accent" />
          <p className="font-display text-xl">Buyer</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Browse shops, save favorites, and check out with Paystack.
          </p>
        </Link>
        <Link
          href="/signup/account?role=seller"
          className="rounded-xl border border-border bg-card p-token-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-accent hover:shadow-md"
        >
          <Store className="mb-3 h-8 w-8 text-accent" />
          <p className="font-display text-xl">Seller</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Open a branded storefront, list products, and get paid.
          </p>
        </Link>
      </div>
      <p className="text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link href="/login" className="text-accent hover:underline">
          Log in
        </Link>
      </p>
    </AuthSplitLayout>
  );
}
