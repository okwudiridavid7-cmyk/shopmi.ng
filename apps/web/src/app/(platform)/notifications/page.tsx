"use client";

import { useState } from "react";
import { Bell, CheckCheck, ExternalLink, X } from "lucide-react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ApiClientError, apiFetch } from "@/lib/api";
import { useAuth } from "@/hooks/use-auth";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { PageHeader } from "@/components/dashboard/page-header";
import { Button } from "@/components/ui/button";
import { SkeletonLines } from "@/components/skeleton";
import { EmptyState } from "@/components/empty-state";

type Notice = { id: string; title: string; body: string; href: string | null; kind: string; createdAt: string; read: boolean };

function notificationLoadMessage(error: unknown): string {
  if (!(error instanceof ApiClientError)) {
    return "The notification API couldn’t be reached. Check that the API server is running, then retry.";
  }
  if (error.status === 404) {
    return "The notification service isn’t available yet. Please try again shortly.";
  }
  if (error.status >= 500) {
    return "The notification service encountered an internal error. Please try again shortly or contact support.";
  }
  return `The notification request failed (${error.status}). ${error.message}`;
}

export default function NotificationsPage() {
  const { user, loading } = useAuth();
  const mode = user?.role === "super_admin" ? "admin" : user?.role === "seller" || user?.role === "tenant_admin" ? "seller" : "buyer";
  const qc = useQueryClient();
  const [active, setActive] = useState<Notice | null>(null);
  const query = useQuery({ queryKey: ["platform-notifications"], queryFn: () => apiFetch<{ notifications: Notice[]; unreadCount: number }>("/api/notifications"), enabled: !!user });
  const read = useMutation({ mutationFn: (id: string) => apiFetch(`/api/notifications/${encodeURIComponent(id)}/read`, { method: "POST" }), onSuccess: () => qc.invalidateQueries({ queryKey: ["platform-notifications"] }) });
  const readAll = useMutation({ mutationFn: () => apiFetch("/api/notifications/read-all", { method: "POST" }), onSuccess: () => qc.invalidateQueries({ queryKey: ["platform-notifications"] }) });
  if (loading || !user) return <div className="p-8"><SkeletonLines count={5} /></div>;
  return <DashboardShell mode={mode}>
    <div className="space-y-6">
      <PageHeader title="Notifications" description="Platform updates, account tasks, and order activity." icon={Bell} actions={<Button variant="outline" disabled={!query.data?.unreadCount || readAll.isPending} onClick={() => readAll.mutate()}><CheckCheck className="mr-2 h-4 w-4" />Mark all as read</Button>} />
      <div className="space-y-3">{query.isLoading ? <SkeletonLines count={5} /> : query.isError ? <EmptyState kind="load_failed" title="Notifications didn’t load" description={notificationLoadMessage(query.error)} actionLabel="Try again" onAction={() => void query.refetch()} /> : query.data?.notifications.length ? query.data.notifications.map((notice) => <button key={notice.id} type="button" onClick={() => { setActive(notice); if (!notice.read) read.mutate(notice.id); }} className={`flex w-full items-start gap-4 rounded-2xl border p-4 text-left transition hover:border-accent/40 hover:bg-card ${notice.read ? "border-border bg-card/60" : "border-accent/25 bg-card shadow-sm"}`}><span className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${notice.read ? "bg-transparent" : "animate-pulse bg-red-600"}`} /><span className="min-w-0 flex-1"><span className="flex flex-wrap items-center gap-2"><span className="font-semibold">{notice.title}</span><span className="rounded-full bg-muted px-2 py-0.5 text-[10px] uppercase tracking-wide text-muted-foreground">{notice.kind.replace("_", " ")}</span></span><span className="mt-1 block line-clamp-2 text-sm text-muted-foreground" dangerouslySetInnerHTML={{ __html: notice.body }} /><span className="mt-2 block text-xs text-muted-foreground">{new Date(notice.createdAt).toLocaleString()}</span></span></button>) : <EmptyState kind="empty" title="You’re all caught up" description="New platform updates, orders, and tasks will appear here." icon={Bell} />}</div>
    </div>
    {active && <div role="dialog" aria-modal="true" aria-labelledby="notification-title" className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-3 sm:p-8" onClick={() => setActive(null)}><article className="flex max-h-full w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-2xl" onClick={(e) => e.stopPropagation()}><header className="flex items-start justify-between gap-4 border-b border-border p-5 sm:p-7"><div><p className="text-xs font-semibold uppercase tracking-wide text-accent">{active.kind.replace("_", " ")} · {new Date(active.createdAt).toLocaleString()}</p><h2 id="notification-title" className="mt-2 text-2xl font-semibold">{active.title}</h2></div><button type="button" onClick={() => setActive(null)} aria-label="Close notification" className="rounded-full p-2 hover:bg-muted"><X className="h-5 w-5" /></button></header><div className="min-h-48 flex-1 overflow-y-auto p-5 sm:p-7"><div className="prose prose-sm max-w-none leading-7 dark:prose-invert" dangerouslySetInnerHTML={{ __html: active.body }} /></div>{active.href && <footer className="border-t border-border p-4 sm:px-7"><Link href={active.href} onClick={() => setActive(null)} className="inline-flex items-center gap-2 text-sm font-semibold text-accent hover:underline">Open related page <ExternalLink className="h-4 w-4" /></Link></footer>}</article></div>}
  </DashboardShell>;
}
