"use client";

import { useEffect } from "react";
import { useTheme } from "next-themes";
import { usePlatformBranding } from "@/hooks/use-branding";

const DEFAULT_FAVICON = "/favicon.png";

export function FaviconSync() {
  const { data } = usePlatformBranding();
  const { resolvedTheme } = useTheme();
  const adminIcon = data?.logoSquareUrl || data?.logoUrl;
  const icon = adminIcon || DEFAULT_FAVICON;

  useEffect(() => {
    if (data?.appName) {
      document.title = data.appName;
    }
    let link = document.querySelector<HTMLLinkElement>("link[rel='icon']");
    if (!link) {
      link = document.createElement("link");
      link.rel = "icon";
      document.head.appendChild(link);
    }
    link.type = "image/png";
    link.href = icon;

    let apple = document.querySelector<HTMLLinkElement>(
      "link[rel='apple-touch-icon']"
    );
    if (!apple) {
      apple = document.createElement("link");
      apple.rel = "apple-touch-icon";
      document.head.appendChild(apple);
    }
    apple.href = icon;
  }, [icon, data?.appName, resolvedTheme]);

  return null;
}
