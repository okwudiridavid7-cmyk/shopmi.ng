"use client";

import Link from "next/link";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { usePlatformBranding, FALLBACK_APP_NAME } from "@/hooks/use-branding";

const LOGO_LIGHT = "/brand/logo-light.png";
const LOGO_DARK = "/brand/logo-dark.png";

export function BrandMark({
  href = "/",
  className = "",
  inverted = false,
}: {
  href?: string;
  className?: string;
  inverted?: boolean;
}) {
  const { data } = usePlatformBranding();
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const name = data?.appName || FALLBACK_APP_NAME || "Shopmi.ng";
  const adminLogo = data?.logoUrl || data?.logoSquareUrl;
  const dark = mounted && (inverted || resolvedTheme === "dark");
  const defaultLogo = dark ? LOGO_DARK : LOGO_LIGHT;
  // Prefer theme-aware brand assets; admin upload still wins when set.
  const logo = adminLogo || defaultLogo;

  return (
    <Link
      href={href}
      className={`flex min-w-0 items-center gap-token-2 ${className}`}
      aria-label={name}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={logo}
        alt={name}
        className="h-8 max-w-[10rem] object-contain object-left sm:h-9"
      />
    </Link>
  );
}
