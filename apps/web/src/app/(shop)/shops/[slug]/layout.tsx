import type { ReactNode } from "react";
import type { Metadata } from "next";
import type { TenantPublic } from "@vendors/shared-types";
import { ShopShell } from "@/components/shell/shop-shell";
import { API_URL, SITE_NAME } from "@/lib/seo";
import { buildPublicShopUrl } from "@/lib/shop-url";
import { parseThemeSettings } from "@/lib/theme";

type Params = { slug: string };

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  try {
    const res = await fetch(`${API_URL}/api/shops/${encodeURIComponent(params.slug)}`, {
      next: { revalidate: 120 },
    });
    if (!res.ok) return { title: "Shop not found", robots: { index: false } };
    const { tenant } = (await res.json()) as { tenant: TenantPublic };
    const theme = parseThemeSettings(tenant.themeSettings);
    const place = tenant.location ? ` in ${tenant.location}` : "";
    const description = (
      theme.shopDescription?.trim() ||
      `Shop ${tenant.name}${place} on ${SITE_NAME}. Browse products, pay securely with Paystack and track your order.`
    ).slice(0, 160);
    const url = buildPublicShopUrl(tenant.slug);
    return {
      title: { default: tenant.name, template: `%s | ${tenant.name}` },
      description,
      alternates: { canonical: url },
      openGraph: {
        title: tenant.name,
        description,
        url,
        siteName: SITE_NAME,
        type: "website",
      },
      twitter: { card: "summary_large_image", title: tenant.name, description },
    };
  } catch {
    return {};
  }
}

export default function ShopLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Params;
}) {
  return <ShopShell slug={params.slug}>{children}</ShopShell>;
}
