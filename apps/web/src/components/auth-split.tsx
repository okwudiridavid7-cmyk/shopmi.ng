"use client";

import type { ReactNode } from "react";
import { BrandMark } from "@/components/brand-mark";
import { useAppName } from "@/hooks/use-branding";

export function AuthSplitLayout({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
}) {
  const appName = useAppName();

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="relative hidden overflow-hidden bg-zinc-950 lg:block">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&w=1600&q=80"
          alt=""
          className="absolute inset-0 h-full w-full object-cover opacity-70"
        />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(255,130,46,0.45),transparent_45%),linear-gradient(to_bottom,rgba(0,0,0,0.25),rgba(0,0,0,0.75))]" />
        <div
          className="absolute inset-0 opacity-30 mix-blend-overlay"
          style={{
            backgroundImage:
              "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.35'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")",
          }}
        />
        <div className="relative z-10 flex h-full flex-col justify-between p-12 text-white">
          <BrandMark href="/" inverted />
          <div className="max-w-md space-y-4">
            <p className="font-display text-4xl leading-tight">
              Independent shops. Real checkout.
            </p>
            <p className="text-sm text-white/80">
              {appName} is built for sellers who want a storefront that looks like
              them — and buyers who want to pay once and know where the order went.
            </p>
          </div>
        </div>
      </div>
      <div className="flex items-center justify-center bg-background px-6 py-12">
        <div className="w-full max-w-md space-y-token-6">
          <div className="lg:hidden">
            <BrandMark href="/" />
          </div>
          <div>
            <h1 className="font-display text-3xl text-foreground">{title}</h1>
            {subtitle && (
              <p className="mt-token-2 text-sm text-muted-foreground">{subtitle}</p>
            )}
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}
