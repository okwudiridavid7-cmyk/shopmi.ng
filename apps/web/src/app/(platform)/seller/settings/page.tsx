"use client";

import { FormEvent, useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import type { TeamMemberPublic } from "@vendors/shared-types";
import { Globe, Mail, Phone, Settings, Store, Users } from "lucide-react";
import { PageHeader } from "@/components/dashboard/page-header";
import { EmptyState, QueryErrorState } from "@/components/empty-state";
import { SkeletonLines } from "@/components/skeleton";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Label, Textarea } from "@/components/ui/input";
import { InputWithIcon } from "@/components/ui/input-with-icon";
import { Select } from "@/components/ui/select";
import { TextLink } from "@/components/ui/text-link";
import { CountryStateSelect } from "@/components/country-state-select";
import { apiFetch } from "@/lib/api";
import {
  useSellerDomain,
  useSellerShop,
  useSellerTeam,
} from "@/hooks/use-seller";

export default function SellerSettingsPage() {
  const shopQ = useSellerShop();
  const teamQ = useSellerTeam();
  const domainQ = useSellerDomain();
  const qc = useQueryClient();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [countryCode, setCountryCode] = useState("");
  const [stateCode, setStateCode] = useState("");
  const [address, setAddress] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [settlementBankCode, setSettlementBankCode] = useState("");
  const [settlementAccountNumber, setSettlementAccountNumber] = useState("");
  const [shopMsg, setShopMsg] = useState<string | null>(null);
  const [shopErr, setShopErr] = useState<string | null>(null);
  const [shopBusy, setShopBusy] = useState(false);

  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"manager" | "staff">("staff");
  const [teamErr, setTeamErr] = useState<string | null>(null);

  const [customDomain, setCustomDomain] = useState("");
  const [domainMsg, setDomainMsg] = useState<string | null>(null);
  const [domainErr, setDomainErr] = useState<string | null>(null);

  useEffect(() => {
    if (shopQ.data) {
      setName(shopQ.data.name);
      setDescription(shopQ.data.description ?? "");
      setLocation(shopQ.data.location ?? "");
      setCountryCode(shopQ.data.countryCode ?? "");
      setStateCode(shopQ.data.stateCode ?? "");
      setAddress(shopQ.data.address ?? "");
      setContactEmail(shopQ.data.contactEmail ?? shopQ.data.email ?? "");
      setContactPhone(shopQ.data.contactPhone ?? shopQ.data.phone ?? "");
      setSettlementBankCode(shopQ.data.settlementBankCode ?? "");
      setSettlementAccountNumber(shopQ.data.settlementAccountNumber ?? "");
    }
  }, [shopQ.data]);

  useEffect(() => {
    if (domainQ.data) {
      setCustomDomain(domainQ.data.customDomain ?? "");
    }
  }, [domainQ.data]);

  async function saveShop(e: FormEvent) {
    e.preventDefault();
    setShopBusy(true);
    setShopMsg(null);
    setShopErr(null);
    try {
      await apiFetch("/api/seller/shop", {
        method: "PATCH",
        body: JSON.stringify({
          name,
          location: location || null,
          countryCode: countryCode || null,
          stateCode: stateCode || null,
          address: address || null,
          description: description || null,
          contactEmail: contactEmail || null,
          contactPhone: contactPhone || null,
          email: contactEmail || null,
          phone: contactPhone || null,
          settlementBankCode: settlementBankCode || null,
          settlementAccountNumber: settlementAccountNumber || null,
        }),
      });
      await qc.invalidateQueries({ queryKey: ["seller", "shop"] });
      setShopMsg("Shop details saved");
    } catch (err) {
      setShopErr(err instanceof Error ? err.message : "Save failed");
    } finally {
      setShopBusy(false);
    }
  }

  async function invite(e: FormEvent) {
    e.preventDefault();
    setTeamErr(null);
    try {
      await apiFetch("/api/seller/team/invite", {
        method: "POST",
        body: JSON.stringify({ email: inviteEmail, role: inviteRole }),
      });
      setInviteEmail("");
      await qc.invalidateQueries({ queryKey: ["seller", "team"] });
    } catch (err) {
      setTeamErr(err instanceof Error ? err.message : "Invite failed");
    }
  }

  async function removeMember(id: string) {
    await apiFetch(`/api/seller/team/${id}`, { method: "DELETE" });
    await qc.invalidateQueries({ queryKey: ["seller", "team"] });
  }

  async function saveDomain(e: FormEvent) {
    e.preventDefault();
    setDomainMsg(null);
    setDomainErr(null);
    try {
      await apiFetch("/api/seller/domain", {
        method: "PUT",
        body: JSON.stringify({
          customDomain: customDomain.trim() || null,
        }),
      });
      await qc.invalidateQueries({ queryKey: ["seller", "domain"] });
      setDomainMsg("Domain saved");
    } catch (err) {
      setDomainErr(err instanceof Error ? err.message : "Save failed");
    }
  }

  if (shopQ.isLoading && !shopQ.data) {
    return <SkeletonLines count={5} />;
  }

  if (shopQ.error && !shopQ.data) {
    return (
      <QueryErrorState
        error={shopQ.error}
        onRetry={() => {
          void shopQ.refetch();
        }}
      />
    );
  }

  const members: TeamMemberPublic[] = teamQ.data ?? [];
  const domainConnected = !!(domainQ.data?.customDomain || customDomain.trim());

  return (
    <div className="space-y-6">
      <PageHeader
        title="Settings"
        description="Shop profile, team admins, and custom domain."
        icon={Settings}
      />

      <Card id="shop" className="overflow-hidden rounded-2xl">
        <CardHeader className="bg-muted/30">
          <p className="text-sm font-semibold text-foreground">Shop details</p>
        </CardHeader>
        <CardBody>
          <form onSubmit={saveShop} className="max-w-2xl space-y-6">
            <div className="grid gap-5 sm:grid-cols-2">
              <Label>
                <span>Shop name</span>
                <InputWithIcon
                  icon={<Store />}
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </Label>
              <div className="space-y-2 sm:col-span-2">
                <p className="text-sm font-medium">Location</p>
                <CountryStateSelect
                  idPrefix="settings-geo"
                  countryCode={countryCode}
                  stateCode={stateCode}
                  onChange={(v) => {
                    setCountryCode(v.countryCode);
                    setStateCode(v.stateCode);
                    setLocation(v.label);
                  }}
                />
              </div>
              <Label className="sm:col-span-2">
                <span>Description</span>
                <Textarea
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="What you sell…"
                />
              </Label>
              <Label className="sm:col-span-2">
                <span>Address</span>
                <Textarea
                  rows={2}
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Street, city…"
                />
              </Label>
              <Label>
                <span>Contact email</span>
                <InputWithIcon
                  icon={<Mail />}
                  type="email"
                  value={contactEmail}
                  onChange={(e) => setContactEmail(e.target.value)}
                />
              </Label>
              <Label>
                <span>Contact phone</span>
                <InputWithIcon
                  icon={<Phone />}
                  value={contactPhone}
                  onChange={(e) => setContactPhone(e.target.value)}
                  placeholder="+234…"
                />
              </Label>
              <Label>
                <span>Settlement bank code</span>
                <InputWithIcon
                  icon={<Globe />}
                  value={settlementBankCode}
                  onChange={(e) => setSettlementBankCode(e.target.value)}
                  placeholder="Paystack bank code (e.g. 058)"
                />
              </Label>
              <Label>
                <span>Settlement account number</span>
                <InputWithIcon
                  icon={<Store />}
                  value={settlementAccountNumber}
                  onChange={(e) => setSettlementAccountNumber(e.target.value)}
                  placeholder="10-digit NUBAN"
                />
              </Label>
            </div>
            <p className="text-xs text-muted-foreground">
              After verification, Shopmi creates a Paystack subaccount from these
              details so your payouts settle to this bank (minus the Shopmi
              Service Fee).
              {shopQ.data?.paystackSubaccountCode
                ? ` Subaccount ready: ${shopQ.data.paystackSubaccountCode}.`
                : ""}
            </p>
            {shopQ.data && (
              <p className="text-xs text-muted-foreground">
                Slug:{" "}
                <TextLink href={`/shops/${shopQ.data.slug}`}>
                  /shops/{shopQ.data.slug}
                </TextLink>
              </p>
            )}
            {shopErr && (
              <p className="text-sm text-red-700 dark:text-red-400">{shopErr}</p>
            )}
            {shopMsg && (
              <p className="text-sm text-emerald-700 dark:text-emerald-400">
                {shopMsg}
              </p>
            )}
            <Button type="submit" disabled={shopBusy} variant="primary">
              {shopBusy ? "Saving…" : "Save shop"}
            </Button>
          </form>
        </CardBody>
      </Card>

      <Card id="team" className="overflow-hidden rounded-2xl">
        <CardHeader className="bg-muted/30">
          <p className="text-sm font-semibold text-foreground">Team admins</p>
        </CardHeader>
        <CardBody className="space-y-6">
          {teamQ.isLoading ? (
            <SkeletonLines count={2} />
          ) : members.length === 0 ? (
            <EmptyState
              kind="users"
              title="No team members"
              description="Invite a manager or staff member to help run this shop."
            />
          ) : (
            <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border">
              {members.map((m) => (
                <li
                  key={m.id}
                  className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-sm"
                >
                  <div>
                    <p className="font-medium text-foreground">
                      {m.user.name || m.user.email}
                    </p>
                    <p className="capitalize text-muted-foreground">
                      {m.role}
                      {m.user.email !== m.user.name ? ` · ${m.user.email}` : ""}
                    </p>
                  </div>
                  {m.role !== "owner" && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => void removeMember(m.id)}
                    >
                      Remove
                    </Button>
                  )}
                </li>
              ))}
            </ul>
          )}

          <form onSubmit={invite} className="max-w-md space-y-4">
            <p className="text-sm font-semibold text-foreground">Invite admin</p>
            <div className="grid gap-4 sm:grid-cols-2">
              <Label>
                <span>Email</span>
                <InputWithIcon
                  icon={<Mail />}
                  type="email"
                  required
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                />
              </Label>
              <Label>
                <span>Role</span>
                <Select
                  icon={<Users />}
                  value={inviteRole}
                  onChange={(e) =>
                    setInviteRole(e.target.value as "manager" | "staff")
                  }
                >
                  <option value="staff">Staff</option>
                  <option value="manager">Manager</option>
                </Select>
              </Label>
            </div>
            {teamErr && (
              <p className="text-sm text-red-700 dark:text-red-400">{teamErr}</p>
            )}
            <Button type="submit" variant="outline">
              Send invite
            </Button>
            <p className="text-xs text-muted-foreground">
              Creates a real tenant_admins membership. Fine-grained permissions
              enforcement can follow later.
            </p>
          </form>
        </CardBody>
      </Card>

      <Card id="domain" className="overflow-hidden rounded-2xl">
        <CardHeader className="flex flex-wrap items-center justify-between gap-2 bg-muted/30">
          <p className="text-sm font-semibold text-foreground">Custom domain</p>
          <span
            className={`rounded-sm px-2 py-0.5 text-xs ${
              domainConnected
                ? "bg-amber-500/15 text-amber-900 dark:text-amber-200"
                : "bg-muted text-muted-foreground"
            }`}
          >
            {domainConnected ? "Pending DNS (not connected)" : "Not connected"}
          </span>
        </CardHeader>
        <CardBody>
          <form onSubmit={saveDomain} className="max-w-lg space-y-4">
            <Label>
              <span>Domain</span>
              <InputWithIcon
                icon={<Globe />}
                value={customDomain}
                onChange={(e) => setCustomDomain(e.target.value)}
                placeholder="shop.yourdomain.com"
              />
            </Label>
            {domainQ.data?.cnameTarget && (
              <p className="text-xs text-muted-foreground">
                Point a CNAME to{" "}
                <code className="rounded bg-muted px-1">
                  {domainQ.data.cnameTarget}
                </code>
                . We’ll use this domain once DNS is verified.
              </p>
            )}
            {domainErr && (
              <p className="text-sm text-red-700 dark:text-red-400">
                {domainErr}
              </p>
            )}
            {domainMsg && (
              <p className="text-sm text-emerald-700 dark:text-emerald-400">
                {domainMsg}
              </p>
            )}
            <Button type="submit" variant="outline">
              Save domain
            </Button>
          </form>
        </CardBody>
      </Card>
    </div>
  );
}
