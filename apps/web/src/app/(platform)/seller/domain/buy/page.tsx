"use client";

import { FormEvent, Suspense, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import type { StatePublic } from "@vendors/shared-types";
import { AlertCircle, ArrowLeft, CircleCheck, Search, ShoppingCart } from "lucide-react";
import { PageHeader } from "@/components/dashboard/page-header";
import { QueryErrorState } from "@/components/empty-state";
import { SkeletonLines } from "@/components/skeleton";
import { CountryStateSelect } from "@/components/country-state-select";
import { Button, buttonClasses } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Input, Label } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { TextLink } from "@/components/ui/text-link";
import { Pill, naira } from "@/components/domain/domain-ui";
import { apiFetch } from "@/lib/api";
import {
  useDomainStore,
  type DomainContactDefaults,
  type DomainOption,
  type DomainSearchResult,
} from "@/hooks/use-seller";
import { cn } from "@/lib/utils";

function OptionRow({
  option,
  onSelect,
  highlight,
}: {
  option: DomainOption;
  onSelect: (o: DomainOption) => void;
  highlight?: boolean;
}) {
  return (
    <li
      className={cn(
        "flex flex-wrap items-center justify-between gap-3 px-4 py-3.5",
        highlight && "bg-dash-tint"
      )}
    >
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <p className="truncate font-semibold text-foreground">{option.domain}</p>
          {highlight ? (
            <Pill tone="green">
              <CircleCheck className="h-3 w-3" aria-hidden /> Available
            </Pill>
          ) : null}
        </div>
        <p className="mt-0.5 text-xs text-muted-foreground">
          {option.free
            ? "Renews free while you stay on your plan"
            : `Renews at ${naira(option.renewPrice)}/year`}
        </p>
      </div>
      <div className="flex items-center gap-4">
        <p className="text-right text-sm font-semibold text-foreground">
          {option.free ? (
            <>
              <span className="mr-1.5 text-xs font-normal text-muted-foreground line-through">
                {naira(option.price)}
              </span>
              Free
            </>
          ) : (
            <>
              {naira(option.price)}
              <span className="font-normal text-muted-foreground">/year</span>
            </>
          )}
        </p>
        <Button size="sm" variant={highlight ? "primary" : "outline"} onClick={() => onSelect(option)}>
          Select
        </Button>
      </div>
    </li>
  );
}

type ContactForm = DomainContactDefaults & { postcode: string };

function Checkout({
  option,
  defaults,
  onBack,
}: {
  option: DomainOption;
  defaults: DomainContactDefaults;
  onBack: () => void;
}) {
  const router = useRouter();
  const [form, setForm] = useState<ContactForm>({ ...defaults, postcode: "" });
  const [years, setYears] = useState(1);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const free = option.free && years === 1;
  const total = free ? 0 : option.price * years;

  const set = (key: keyof ContactForm) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  async function stateName(): Promise<string> {
    if (!form.stateCode) return "";
    try {
      const res = await apiFetch<{ states: StatePublic[] }>(
        `/api/geo/countries/${encodeURIComponent(form.country)}/states`
      );
      return res.states.find((s) => (s.iso2 || s.name) === form.stateCode)?.name ?? form.stateCode;
    } catch {
      return form.stateCode;
    }
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await apiFetch<
        | { status: "registering"; domain: string }
        | { status: "payment"; authorizationUrl: string }
      >("/api/seller/domain/buy", {
        method: "POST",
        body: JSON.stringify({
          domain: option.domain,
          years,
          contact: {
            firstName: form.firstName,
            lastName: form.lastName,
            company: form.company || null,
            email: form.email,
            phone: form.phone,
            address: form.address,
            city: form.city,
            state: await stateName(),
            country: form.country,
            postcode: form.postcode || null,
          },
        }),
      });
      if (res.status === "payment") {
        window.location.assign(res.authorizationUrl);
        return;
      }
      router.push(`/seller/domain?claimed=${encodeURIComponent(res.domain)}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start">
      <Card className="overflow-hidden rounded-2xl">
        <CardHeader className="bg-muted/30">
          <p className="text-sm font-semibold text-foreground">Domain owner</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            The domain is registered in this name. These details go to the registry and are used
            to confirm ownership, so use real information.
          </p>
        </CardHeader>
        <CardBody className="grid gap-4 sm:grid-cols-2">
          <Label>
            <span>First name</span>
            <Input required value={form.firstName} placeholder="Ada" onChange={set("firstName")} autoComplete="given-name" />
          </Label>
          <Label>
            <span>Last name</span>
            <Input required value={form.lastName} placeholder="Okonkwo" onChange={set("lastName")} autoComplete="family-name" />
          </Label>
          <Label className="sm:col-span-2">
            <span>
              Business name <span className="text-muted-foreground">(optional)</span>
            </span>
            <Input value={form.company} placeholder="e.g. Lagos Loom Ltd" onChange={set("company")} autoComplete="organization" />
          </Label>
          <Label>
            <span>Email</span>
            <Input required type="email" value={form.email} placeholder="you@example.com" onChange={set("email")} autoComplete="email" />
          </Label>
          <Label>
            <span>Phone</span>
            <Input
              required
              type="tel"
              value={form.phone}
              onChange={set("phone")}
              placeholder="+234 xxx xxx xxxx"
              autoComplete="tel"
            />
          </Label>
          <Label className="sm:col-span-2">
            <span>Street address</span>
            <Input required value={form.address} placeholder="e.g. 12 Admiralty Way, Lekki" onChange={set("address")} autoComplete="street-address" />
          </Label>
          <Label>
            <span>City</span>
            <Input required value={form.city} placeholder="e.g. Lagos" onChange={set("city")} autoComplete="address-level2" />
          </Label>
          <Label>
            <span>
              Postcode <span className="text-muted-foreground">(optional)</span>
            </span>
            <Input value={form.postcode} placeholder="e.g. 101233" onChange={set("postcode")} autoComplete="postal-code" />
          </Label>
          <CountryStateSelect
            className="grid gap-4 sm:col-span-2 sm:grid-cols-2"
            idPrefix="domain-owner"
            required
            countryCode={form.country}
            stateCode={form.stateCode}
            onChange={(v) => setForm((f) => ({ ...f, country: v.countryCode, stateCode: v.stateCode }))}
          />
        </CardBody>
      </Card>

      <Card className="overflow-hidden rounded-2xl lg:sticky lg:top-6">
        <CardHeader className="bg-muted/30">
          <p className="text-sm font-semibold text-foreground">Summary</p>
        </CardHeader>
        <CardBody className="space-y-4">
          <div>
            <p className="break-all text-base font-semibold text-foreground">{option.domain}</p>
            <button
              type="button"
              onClick={onBack}
              className="mt-1 text-xs font-medium text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
            >
              Change domain
            </button>
          </div>
          {option.free ? (
            <p className="rounded-lg bg-dash-tint px-3 py-2 text-xs text-foreground">
              Included with your plan for the first year, and renewed free while you stay on it.
            </p>
          ) : (
            <Label>
              <span>Registration period</span>
              <Select value={String(years)} onChange={(e) => setYears(Number(e.target.value))}>
                {[1, 2, 3].map((y) => (
                  <option key={y} value={y}>
                    {y} year{y > 1 ? "s" : ""} · {naira(option.price * y)}
                  </option>
                ))}
              </Select>
            </Label>
          )}
          <dl className="space-y-1.5 border-t border-border pt-3 text-sm">
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Total today</dt>
              <dd className="font-semibold text-foreground">{free ? "Free" : naira(total)}</dd>
            </div>
            {!option.free ? (
              <div className="flex justify-between text-xs">
                <dt className="text-muted-foreground">Then</dt>
                <dd className="text-muted-foreground">{naira(option.renewPrice)}/year</dd>
              </div>
            ) : null}
          </dl>
          {error ? (
            <p role="alert" className="text-sm text-danger">
              {error}
            </p>
          ) : null}
          <Button type="submit" className="w-full" disabled={busy}>
            {busy ? "Please wait…" : free ? "Claim free domain" : `Pay ${naira(total)}`}
          </Button>
          <p className="text-xs text-muted-foreground">
            {free
              ? "We register it and set up its DNS for you."
              : "You'll pay securely with Paystack. Once paid, we register the domain and set up its DNS for you."}
          </p>
        </CardBody>
      </Card>
    </form>
  );
}

function BuyDomain() {
  const params = useSearchParams();
  const router = useRouter();
  const storeQ = useDomainStore();
  const [q, setQ] = useState(params.get("q") ?? "");
  const [result, setResult] = useState<DomainSearchResult | null>(null);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<DomainOption | null>(null);
  const autoRan = useRef(false);

  async function search(term: string) {
    const value = term.trim();
    if (!value) return;
    setSearching(true);
    setError(null);
    setSelected(null);
    try {
      const res = await apiFetch<DomainSearchResult>(
        `/api/seller/domain/search?q=${encodeURIComponent(value)}`
      );
      setResult(res);
      router.replace(`/seller/domain/buy?q=${encodeURIComponent(value)}`, { scroll: false });
    } catch (err) {
      setResult(null);
      setError(err instanceof Error ? err.message : "Search failed");
    } finally {
      setSearching(false);
    }
  }

  const store = storeQ.data;
  useEffect(() => {
    if (autoRan.current || !store?.available || !store.planAllowed) return;
    autoRan.current = true;
    const initial = params.get("q");
    if (initial) void search(initial);
  }, [store]); // eslint-disable-line react-hooks/exhaustive-deps

  if (storeQ.isError) {
    return <QueryErrorState error={storeQ.error} onRetry={() => void storeQ.refetch()} />;
  }

  const back = (
    <Link
      href="/seller/domain"
      className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground"
    >
      <ArrowLeft className="h-4 w-4" aria-hidden /> Domain
    </Link>
  );

  if (!store) {
    return (
      <div className="space-y-6">
        {back}
        <SkeletonLines count={4} />
      </div>
    );
  }

  const blocked = !store.planAllowed
    ? (
        <>
          Buying a domain is available on Lemi and Dami. <TextLink href="/seller/plan">See plans</TextLink>
        </>
      )
    : !store.available
      ? "Domain purchases aren't available right now. You can still connect a domain you already own."
      : null;

  const available = result
    ? [result.exact, ...result.results].filter((o) => o.available)
    : [];

  return (
    <div className="space-y-6">
      {back}
      <PageHeader
        title={selected ? "Complete your purchase" : "Buy a domain"}
        icon={ShoppingCart}
        description={
          selected
            ? undefined
            : store.freeEligible
              ? `Search for a name. Your plan includes one .${store.freeTld} domain free.`
              : "Search for a name for your store."
        }
      />

      {blocked ? (
        <div className="rounded-2xl border border-border bg-card px-4 py-3 text-sm text-muted-foreground">
          {blocked}
          {store.planAllowed ? (
            <div className="mt-3">
              <Link href="/seller/domain/connect" className={buttonClasses("outline", "sm")}>
                Connect a domain
              </Link>
            </div>
          ) : null}
        </div>
      ) : selected ? (
        <Checkout option={selected} defaults={store.contactDefaults} onBack={() => setSelected(null)} />
      ) : (
        <>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void search(q);
            }}
            className="flex max-w-2xl gap-2"
          >
            <div className="relative flex-1">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                aria-hidden
              />
              <Input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="yourbrand"
                aria-label="Domain name"
                autoCapitalize="none"
                autoComplete="off"
                spellCheck={false}
                className="h-11 pl-9"
                autoFocus
              />
            </div>
            <Button type="submit" size="lg" disabled={searching || !q.trim()}>
              {searching ? "Searching…" : "Search"}
            </Button>
          </form>

          <p className="-mt-3 text-xs text-muted-foreground">
            We check {store.tlds.map((t) => `.${t.tld}`).join(", ")}.
          </p>

          {error ? (
            <p role="alert" className="text-sm text-danger">
              {error}
            </p>
          ) : null}

          {searching && !result ? <SkeletonLines count={4} /> : null}

          {result ? (
            <div className={cn("space-y-4", searching && "opacity-60")}>
              {!result.exact.available ? (
                <div
                  role="status"
                  className="flex items-center gap-2 rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-900 dark:text-amber-200"
                >
                  <AlertCircle className="h-4 w-4 shrink-0" aria-hidden />
                  <span>
                    <strong className="font-semibold">{result.exact.domain}</strong> is already taken.
                  </span>
                </div>
              ) : null}

              {available.length > 0 ? (
                <Card className="overflow-hidden rounded-2xl">
                  <CardHeader className="bg-muted/30">
                    <p className="text-sm font-semibold text-foreground">Available domains</p>
                  </CardHeader>
                  <ul className="divide-y divide-border">
                    {available.map((o) => (
                      <OptionRow
                        key={o.domain}
                        option={o}
                        highlight={o.domain === result.exact.domain}
                        onSelect={setSelected}
                      />
                    ))}
                  </ul>
                </Card>
              ) : null}

              {result.suggestions.length > 0 ? (
                <Card className="overflow-hidden rounded-2xl">
                  <CardHeader className="bg-muted/30">
                    <p className="text-sm font-semibold text-foreground">Similar names</p>
                  </CardHeader>
                  <ul className="divide-y divide-border">
                    {result.suggestions.map((o) => (
                      <OptionRow key={o.domain} option={o} onSelect={setSelected} />
                    ))}
                  </ul>
                </Card>
              ) : null}

              {available.length === 0 && result.suggestions.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Nothing available for that name. Try a different spelling or add a word like
                  &ldquo;shop&rdquo; or &ldquo;store&rdquo;.
                </p>
              ) : null}
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}

export default function BuyDomainPage() {
  return (
    <Suspense fallback={<SkeletonLines count={4} />}>
      <BuyDomain />
    </Suspense>
  );
}
