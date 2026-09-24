"use client";

import { useEffect, useState } from "react";
import { Mail, MapPin, Phone } from "lucide-react";
import type { TenantPublic } from "@vendors/shared-types";
import { ContactForm } from "@/components/contact-form";
import { apiFetch } from "@/lib/api";
import { parseHexColor, parseThemeSettings } from "@/lib/theme";

export default function ShopContactPage({
  params,
}: {
  params: { slug: string };
}) {
  const [tenant, setTenant] = useState<TenantPublic | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiFetch<{ tenant: TenantPublic }>(`/api/shops/${params.slug}`)
      .then((r) => setTenant(r.tenant))
      .catch((err) =>
        setError(err instanceof Error ? err.message : "Failed to load")
      );
  }, [params.slug]);

  if (error) {
    return <p className="text-sm text-danger">{error}</p>;
  }

  const theme = parseThemeSettings(tenant?.themeSettings);
  const brand =
    parseHexColor(theme.primaryColor) ?? parseHexColor(theme.accentColor);
  const social = tenant?.socialLinks;
  const socialEntries = social
    ? Object.entries(social).filter(([, v]) => typeof v === "string" && v)
    : [];
  const name = tenant?.name ?? "this shop";

  return (
    <div className="space-y-token-10">
      <section
        className="overflow-hidden rounded-lg border border-border bg-muted/40 px-token-6 py-token-10 sm:px-token-12 sm:py-token-12"
        style={brand ? { borderTopWidth: 3, borderTopColor: brand } : undefined}
      >
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
          Contact
        </p>
        <h1 className="mt-token-3 font-display text-4xl leading-tight text-foreground sm:text-5xl">
          Get in touch with {name}
        </h1>
        <p className="mt-token-4 max-w-xl text-sm leading-relaxed text-muted-foreground">
          Questions about an order, a listing, or a custom request — send a
          message and it goes to this shop’s inbox.
        </p>
      </section>

      <div className="grid gap-token-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
        <aside className="space-y-token-4">
          {tenant?.email && (
            <div className="rounded-lg border border-border bg-card p-token-5 shadow-sm">
              <div className="flex gap-token-3">
                <Mail className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium text-foreground">Email</p>
                  <a
                    className="text-sm text-muted-foreground transition hover:text-foreground"
                    href={`mailto:${tenant.email}`}
                  >
                    {tenant.email}
                  </a>
                </div>
              </div>
            </div>
          )}
          {tenant?.phone && (
            <div className="rounded-lg border border-border bg-card p-token-5 shadow-sm">
              <div className="flex gap-token-3">
                <Phone className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium text-foreground">Phone</p>
                  <a
                    className="text-sm text-muted-foreground transition hover:text-foreground"
                    href={`tel:${tenant.phone}`}
                  >
                    {tenant.phone}
                  </a>
                </div>
              </div>
            </div>
          )}
          {(tenant?.address || tenant?.location) && (
            <div className="rounded-lg border border-border bg-card p-token-5 shadow-sm">
              <div className="flex gap-token-3">
                <MapPin className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium text-foreground">Location</p>
                  <p className="whitespace-pre-wrap text-sm text-muted-foreground">
                    {[tenant.address, tenant.location, tenant.stateCode, tenant.countryCode]
                      .filter(Boolean)
                      .join("\n")}
                  </p>
                </div>
              </div>
            </div>
          )}
          {socialEntries.length > 0 && (
            <div className="flex flex-wrap gap-token-3 text-sm">
              {socialEntries.map(([key, value]) => (
                <a
                  key={key}
                  href={value!.startsWith("http") ? value! : `https://${value}`}
                  target="_blank"
                  rel="noreferrer"
                  className="capitalize text-muted-foreground transition hover:text-foreground"
                  style={brand ? { color: brand } : undefined}
                >
                  {key}
                </a>
              ))}
            </div>
          )}
        </aside>
        <div className="rounded-lg border border-border bg-card p-token-6 shadow-sm sm:p-token-8">
          <h2 className="font-display text-2xl text-foreground">Send a message</h2>
          {theme.contactFormEnabled === false ? (
            <p className="mt-token-4 text-sm text-muted-foreground">
              This shop is not accepting contact form messages right now. Use
              the details on the left if available.
            </p>
          ) : (
            <>
              <p className="mb-token-6 mt-token-2 text-sm text-muted-foreground">
                We’ll email {name} with your details.
              </p>
              <ContactForm
                endpoint={`/api/contact/shops/${params.slug}`}
                accent={brand}
              />
            </>
          )}
        </div>
      </div>
    </div>
  );
}
