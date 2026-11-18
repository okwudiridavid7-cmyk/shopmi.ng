"use client";

import { useMemo, useState } from "react";
import { Mail, Search, Send, Users } from "lucide-react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import type { UserRole } from "@vendors/shared-types";
import { PageHeader } from "@/components/dashboard/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { InputWithIcon } from "@/components/ui/input-with-icon";
import { Select } from "@/components/ui/select";
import { RichMessageEditor } from "@/components/admin/rich-message-editor";
import { useToast } from "@/components/ui/toast";

type AudienceUser = { id: string; name: string | null; email: string; role: UserRole; createdAt: string; plans: { id: string; name: string }[] };
type Plan = { id: string; name: string };

export default function AdminEmailPage() {
  const [search, setSearch] = useState("");
  const [role, setRole] = useState("all");
  const [planId, setPlanId] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [campaignId] = useState(() => crypto.randomUUID());
  const { toast } = useToast();
  const usersQuery = useQuery({ queryKey: ["admin", "email-audience", search, role, planId], queryFn: async () => { const params = new URLSearchParams(); if (search) params.set("q", search); if (role !== "all") params.set("role", role); if (planId) params.set("planId", planId); return (await apiFetch<{ users: AudienceUser[] }>(`/api/admin/users?${params.toString()}`)).users; } });
  const plansQuery = useQuery({ queryKey: ["plans"], queryFn: async () => (await apiFetch<{ plans: Plan[] }>("/api/plans")).plans });
  const users = usersQuery.data ?? [];
  const filtered = useMemo(() => users, [users]);
  const send = useMutation({
    mutationFn: () => apiFetch<{ queued: number; matched: number }>("/api/admin/email-broadcast", { method: "POST", body: JSON.stringify({ subject, body: message, role, planId: planId || undefined, userIds: selected, campaignId }) }),
    onSuccess: (result) => toast({ title: "Email campaign queued", description: `${result.queued} emails are queued for delivery.` }),
    onError: (error) => toast({ title: "Email could not be sent", description: error instanceof Error ? error.message : "Check your email configuration and try again.", tone: "danger" }),
  });
  const toggle = (id: string) => setSelected((old) => old.includes(id) ? old.filter((item) => item !== id) : [...old, id]);
  const toggleVisible = () => setSelected((old) => {
    const ids = filtered.map((u) => u.id);
    return ids.every((id) => old.includes(id)) ? old.filter((id) => !ids.includes(id)) : [...new Set([...old, ...ids])];
  });
  return <div className="space-y-7">
    <PageHeader title="Email users" description="Send to all users at once, a role or plan group, or individual selections. Delivery uses Resend." icon={Mail} />
    <section className="space-y-4 rounded-2xl border border-border bg-card p-5 shadow-sm">
      <h2 className="font-semibold">Recipients</h2>
      <div className="grid gap-3 sm:grid-cols-3">
        <Select value={role} onChange={(e) => setRole(e.target.value)}><option value="all">All users</option><option value="buyer">Buyers</option><option value="seller">Sellers</option><option value="tenant_admin">Shop team members</option></Select>
        <Select value={planId} onChange={(e) => setPlanId(e.target.value)}><option value="">Any plan</option>{(plansQuery.data ?? []).map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</Select>
        <InputWithIcon icon={<Search />} value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search users" />
      </div>
      <div className="flex items-center justify-between text-sm"><span className="text-muted-foreground">{selected.length ? `${selected.length} individually selected` : `${filtered.length} matching users`}</span><button type="button" className="font-medium text-accent hover:underline" onClick={toggleVisible}>{filtered.length > 0 && filtered.every((u) => selected.includes(u.id)) ? "Clear visible" : "Select visible"}</button></div>
      <div className="max-h-64 divide-y divide-border overflow-y-auto rounded-xl border border-border">
        {filtered.map((u) => <label key={u.id} className="flex cursor-pointer items-center gap-3 px-3 py-2.5 hover:bg-muted/30"><input type="checkbox" checked={selected.includes(u.id)} onChange={() => toggle(u.id)} className="h-4 w-4 accent-emerald-700" /><span className="min-w-0 flex-1"><span className="block truncate text-sm font-medium">{u.name || u.email}</span><span className="block truncate text-xs text-muted-foreground">{u.email}</span></span><span className="text-xs capitalize text-muted-foreground">{u.role.replace("_", " ")}</span></label>)}
        {!filtered.length && <p className="p-5 text-sm text-muted-foreground">No users match this search.</p>}
      </div>
      <p className="text-xs text-muted-foreground">Choose users above to email them individually. If none are selected, all users matching the role and plan filters receive the message. Plan targeting includes sellers with at least one shop on that plan.</p>
    </section>
    <section className="space-y-4 rounded-2xl border border-border bg-card p-5 shadow-sm">
      <h2 className="flex items-center gap-2 font-semibold"><Users className="h-4 w-4" />Message</h2>
      <Input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Email subject" maxLength={160} />
      <RichMessageEditor onChange={setMessage} placeholder="Write a warm, clear message…" />
      <div className="flex justify-end"><Button disabled={!subject.trim() || !message.trim() || send.isPending || (!selected.length && role === "all" && !planId && users.length > 500)} onClick={() => send.mutate()}><Send className="mr-2 h-4 w-4" />{send.isPending ? "Sending…" : `Send ${selected.length ? `to ${selected.length}` : "email"}`}</Button></div>
    </section>
  </div>;
}
