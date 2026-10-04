import type { Metadata } from "next";

export const SITE_NAME = "Shopmi.ng";
export const SITE_URL = (process.env.NEXT_PUBLIC_WEB_URL ?? "http://localhost:3000").replace(/\/$/, "");
export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

export const SITE_DESCRIPTION =
  "Shop from independent Nigerian brands or open your own online store in minutes. Paystack checkout, WhatsApp updates and a branded shop link, all in one place.";

/** Per-page metadata with canonical URL plus matching Open Graph and Twitter fields. */
export function pageMetadata({
  title,
  description,
  path,
  absoluteTitle = false,
}: {
  title: string;
  description: string;
  path: string;
  absoluteTitle?: boolean;
}): Metadata {
  const fullTitle = absoluteTitle ? title : `${title} | ${SITE_NAME}`;
  return {
    title: absoluteTitle ? { absolute: title } : title,
    description,
    alternates: { canonical: path },
    openGraph: {
      title: fullTitle,
      description,
      url: path,
      siteName: SITE_NAME,
      locale: "en_NG",
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: fullTitle,
      description,
    },
  };
}

export const NO_INDEX: Metadata = {
  robots: { index: false, follow: false },
};
