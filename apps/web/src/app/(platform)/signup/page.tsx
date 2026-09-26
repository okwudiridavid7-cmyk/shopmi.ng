"use client";

import Link from "next/link";
import { ShoppingBag, Store } from "lucide-react";
import { AuthSplitLayout } from "@/components/auth-split";
import { TextLink } from "@/components/ui/text-link";
import { useAppName } from "@/hooks/use-branding";
import { cn } from "@/lib/utils";

export default function SignupRolePage() {
  const appName = useAppName();
  return (
    <AuthSplitLayout
      title="I want to be a…"
      subtitle={`Choose how you’ll use ${appName}. You can always open a shop later from your account.`}
    >
      <div className="grid gap-3">
        <Link
          href="/signup/account?role=buyer"
          className={cn(
            "flex items-start gap-4 rounded-2xl border border-border bg-card p-5 text-left transition",
            "hover:border-accent hover:bg-accent/5"
          )}
        >
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-accent/15 text-accent dark:text-accent-on-dark">
            <ShoppingBag className="h-5 w-5" aria-hidden />
          </span>
          <span className="min-w-0">
            <span className="block font-semibold text-foreground">Buyer</span>
            <span className="mt-1 block text-sm text-muted-foreground">
              Browse shops, save favorites, and check out with Paystack.
            </span>
          </span>
        </Link>
        <Link
          href="/signup/account?role=seller"
          className={cn(
            "flex items-start gap-4 rounded-2xl border border-border bg-card p-5 text-left transition",
            "hover:border-accent hover:bg-accent/5"
          )}
        >
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-accent/15 text-accent dark:text-accent-on-dark">
            <Store className="h-5 w-5" aria-hidden />
          </span>
          <span className="min-w-0">
            <span className="block font-semibold text-foreground">Seller</span>
            <span className="mt-1 block text-sm text-muted-foreground">
              Open a branded storefront, list products, and get paid.
            </span>
          </span>
        </Link>
      </div>
      <p className="text-center text-sm text-muted-foreground lg:text-left">
        Already have an account? <TextLink href="/login">Log in</TextLink>
      </p>
    </AuthSplitLayout>
  );
}
