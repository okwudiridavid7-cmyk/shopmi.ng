"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useQueryClient } from "@tanstack/react-query";
import type { TeamMemberPublic } from "@vendors/shared-types";
import { EmptyState } from "@/components/empty-state";
import { SkeletonLines } from "@/components/skeleton";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Input, Label, Textarea } from "@/components/ui/input";
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
      <EmptyState
        title="Could not load shop"
        description={
          shopQ.error instanceof Error
            ? shopQ.error.message
            : "Sign in as a seller to manage settings."
        }
        actionLabel="Overview"
        actionHref="/seller"
      />
    );
  }

  const members: TeamMemberPublic[] = teamQ.data ?? [];
  const domainConnected = !!(domainQ.data?.customDomain || customDomain.trim());

  return (
    <div className="space-y-token-6">
      <div>
        <h1 className="font-display text-2xl text-foreground">Settings</h1>
        <p className="mt-token-1 text-sm text-muted-foreground">
          Shop profile, team admins, and custom domain.
        </p>
      </div>

      <Card id="shop">
        <CardHeader>
          <p className="text-sm font-medium">Shop details</p>
        </CardHeader>
        <CardBody>
          <form onSubmit={saveShop} className="max-w-lg space-y-token-4">
            <Label>
              <span>Shop name</span>
              <Input
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </Label>
            <Label>
              <span>Description</span>
              <Textarea
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What you sell…"
              />
            </Label>
            <div className="space-y-token-2">
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
            <Label>
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
              <Input
                type="email"
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
              />
            </Label>
            <Label>
              <span>Contact phone</span>
              <Input
                value={contactPhone}
                onChange={(e) => setContactPhone(e.target.value)}
                placeholder="+234…"
              />
            </Label>
            {shopQ.data && (
              <p className="text-xs text-muted-foreground">
                Slug:{" "}
                <Link
                  href={`/shops/${shopQ.data.slug}`}
                  className="text-accent underline"
                >
                  /shops/{shopQ.data.slug}
                </Link>
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

      <Card id="team">
        <CardHeader>
          <p className="text-sm font-medium">Team admins</p>
        </CardHeader>
        <CardBody className="space-y-token-4">
          {teamQ.isLoading ? (
            <SkeletonLines count={2} />
          ) : members.length === 0 ? (
            <EmptyState
              title="No team members"
              description="Invite a manager or staff member to help run this shop."
            />
          ) : (
            <ul className="divide-y divide-border rounded-md border border-border">
              {members.map((m) => (
                <li
                  key={m.id}
                  className="flex flex-wrap items-center justify-between gap-token-2 px-token-4 py-token-3 text-sm"
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

          <form onSubmit={invite} className="max-w-md space-y-token-3">
            <p className="text-sm font-medium text-foreground">Invite admin</p>
            <Label>
              <span>Email</span>
              <Input
                type="email"
                required
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
              />
            </Label>
            <Label>
              <span>Role</span>
              <select
                className="w-full rounded-md border border-border bg-card px-token-3 py-token-2 text-sm"
                value={inviteRole}
                onChange={(e) =>
                  setInviteRole(e.target.value as "manager" | "staff")
                }
              >
                <option value="staff">Staff</option>
                <option value="manager">Manager</option>
              </select>
            </Label>
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

      <Card id="domain">
        <CardHeader className="flex flex-wrap items-center justify-between gap-token-2">
          <p className="text-sm font-medium">Custom domain</p>
          <span
            className={`rounded-sm px-token-2 py-0.5 text-xs ${
              domainConnected
                ? "bg-amber-500/15 text-amber-900 dark:text-amber-200"
                : "bg-muted text-muted-foreground"
            }`}
          >
            {domainConnected ? "Pending DNS (not connected)" : "Not connected"}
          </span>
        </CardHeader>
        <CardBody>
          <form onSubmit={saveDomain} className="max-w-lg space-y-token-4">
            <Label>
              <span>Domain</span>
              <Input
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
                . Full DNS/SSL provisioning is Phase 4 — this field stores your
                intended domain for now.
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
