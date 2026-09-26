"use client";

import type { ReactNode } from "react";
import { BrandMark } from "@/components/brand-mark";
import { useAppName } from "@/hooks/use-branding";

/** Sleeker retail / architecture hero — dark, calm, high-end. */
const AUTH_HERO =
  "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1600&q=80";

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
    <div className="grid min-h-dvh lg:grid-cols-2">
      <div className="relative hidden overflow-hidden bg-zinc-950 lg:block">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={AUTH_HERO}
          alt=""
          className="absolute inset-0 h-full w-full scale-105 object-cover opacity-60"
        />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_30%_20%,rgba(255,130,46,0.35),transparent_50%),linear-gradient(to_bottom,rgba(10,10,12,0.35),rgba(10,10,12,0.88))]" />
        <div className="relative z-10 flex h-full flex-col justify-between p-10 xl:p-14">
          <BrandMark href="/" inverted />
          <div className="max-w-md space-y-4 text-white">
            <p className="font-display text-3xl font-semibold leading-tight xl:text-4xl">
              Independent shops.
              <br />
              Real checkout.
            </p>
            <p className="text-sm leading-relaxed text-white/75">
              {appName} is built for sellers who want a storefront that looks
              like them — and buyers who want to pay once and know where the
              order went.
            </p>
          </div>
        </div>
      </div>

      <div className="flex flex-1 flex-col justify-center bg-background px-5 py-10 sm:px-8 sm:py-12">
        <div className="mx-auto w-full max-w-[24rem] space-y-6">
          <div className="flex justify-center lg:hidden">
            <BrandMark href="/" className="justify-center [&_img]:mx-auto" />
          </div>
          <div className="space-y-2 text-center lg:text-left">
            <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              {title}
            </h1>
            {subtitle ? (
              <p className="text-sm leading-relaxed text-muted-foreground">
                {subtitle}
              </p>
            ) : null}
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}
