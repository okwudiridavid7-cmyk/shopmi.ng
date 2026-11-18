"use client";

import { useState } from "react";
import { Megaphone, Send } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { PageHeader } from "@/components/dashboard/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { RichMessageEditor } from "@/components/admin/rich-message-editor";
import { useToast } from "@/components/ui/toast";

type Notice = { id: string; title: string; body: string; audience: string; createdAt: string };

export default function AdminAnnouncementsPage() {
  const [title, setTitle] = useState("");
  const [audience, setAudience] = useState("all");
  const [message, setMessage] = useState("");
  const { toast } = useToast();
  const qc = useQueryClient();
  const list = useQuery({ queryKey: ["admin", "notifications"], queryFn: () => apiFetch<{ notifications: Notice[] }>("/api/admin/notifications") });
  const publish = useMutation({
    mutationFn: () => apiFetch("/api/admin/notifications", { method: "POST", body: JSON.stringify({ title, audience, body: message }) }),
    onSuccess: async () => { setTitle(""); setMessage(""); await qc.invalidateQueries({ queryKey: ["admin", "notifications"] }); toast({ title: "Announcement published", description: "It is now available in the selected dashboards." }); },
    onError: (error) => toast({ title: "Could not publish", description: error instanceof Error ? error.message : "Please try again.", tone: "danger" }),
  });
  return <div className="space-y-7">
    <PageHeader title="Announcements" description="Publish platform updates and helpful notices to user dashboards." icon={Megaphone} />
    <section className="space-y-4 rounded-2xl border border-border bg-card p-5 shadow-sm">
      <h2 className="font-semibold">New announcement</h2>
      <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Announcement title" maxLength={120} />
      <div className="max-w-xs"><Select value={audience} onChange={(e) => setAudience(e.target.value)}><option value="all">Everyone</option><option value="buyer">Buyers</option><option value="seller">Sellers</option><option value="tenant_admin">Shop team members</option></Select></div>
      <RichMessageEditor onChange={setMessage} placeholder="Share an update with your users…" />
      <div className="flex justify-end"><Button disabled={!title.trim() || !message.trim() || publish.isPending} onClick={() => publish.mutate()}><Send className="mr-2 h-4 w-4" />Publish announcement</Button></div>
    </section>
    <section className="space-y-3"><h2 className="font-semibold">Recent announcements</h2>{(list.data?.notifications ?? []).map((n) => <article key={n.id} className="rounded-xl border border-border bg-card p-4"><div className="flex items-start justify-between gap-3"><div><h3 className="font-medium">{n.title}</h3><div className="prose prose-sm mt-2 max-w-none text-muted-foreground" dangerouslySetInnerHTML={{ __html: n.body }} /></div><span className="shrink-0 rounded-full bg-muted px-2.5 py-1 text-xs capitalize">{n.audience === "all" ? "Everyone" : n.audience}</span></div><p className="mt-3 text-xs text-muted-foreground">{new Date(n.createdAt).toLocaleString()}</p></article>)}</section>
  </div>;
}
