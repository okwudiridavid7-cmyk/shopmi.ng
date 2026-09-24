"use client";

import { useState } from "react";
import { EmptyState } from "@/components/empty-state";
import { SkeletonLines } from "@/components/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { useToast } from "@/components/ui/toast";
import {
  useAdminContactInquiries,
  useDeleteContactInquiry,
  useDeleteContactInquiriesByEmail,
  type AdminContactInquiryRow,
} from "@/hooks/use-admin";

export default function AdminContactInquiriesPage() {
  const [email, setEmail] = useState("");
  const [q, setQ] = useState("");
  const { data: inquiries = [], isLoading, error } = useAdminContactInquiries(
    email,
    q
  );
  const deleteOne = useDeleteContactInquiry();
  const deleteByEmail = useDeleteContactInquiriesByEmail();
  const { toast } = useToast();

  const [deleteTarget, setDeleteTarget] =
    useState<AdminContactInquiryRow | null>(null);
  const [dsarEmail, setDsarEmail] = useState<string | null>(null);

  return (
    <div className="space-y-token-4">
      <div>
        <h1 className="font-display text-2xl text-foreground">
          Contact inquiries
        </h1>
        <p className="mt-token-1 text-sm text-muted-foreground">
          Search platform and shop contact submissions for support and DSAR
          requests. Rows expire after about 180 days.
        </p>
      </div>

      <div className="flex flex-wrap gap-token-3">
        <Input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Exact email…"
          className="max-w-xs"
        />
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search name, email, subject…"
          className="max-w-xs"
        />
        <Button
          type="button"
          variant="outline"
          disabled={!email.trim()}
          onClick={() => setDsarEmail(email.trim().toLowerCase())}
        >
          Delete all for email
        </Button>
      </div>

      {error ? (
        <p className="text-sm text-muted-foreground">
          {error instanceof Error ? error.message : "Failed to load"}
        </p>
      ) : isLoading ? (
        <SkeletonLines count={5} />
      ) : inquiries.length === 0 ? (
        <EmptyState
          title="No inquiries match"
          description="Try an email filter or broader search."
        />
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border bg-card">
          <table className="w-full min-w-[48rem] text-left text-sm">
            <thead className="border-b border-border text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-token-4 py-token-3 font-medium">When</th>
                <th className="px-token-4 py-token-3 font-medium">From</th>
                <th className="px-token-4 py-token-3 font-medium">Subject</th>
                <th className="px-token-4 py-token-3 font-medium">Scope</th>
                <th className="px-token-4 py-token-3 font-medium">Status</th>
                <th className="px-token-4 py-token-3 font-medium" />
              </tr>
            </thead>
            <tbody>
              {inquiries.map((row) => (
                <tr key={row.id} className="border-b border-border/60">
                  <td className="px-token-4 py-token-3 text-muted-foreground">
                    {new Date(row.createdAt).toLocaleString()}
                  </td>
                  <td className="px-token-4 py-token-3">
                    <div className="font-medium">{row.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {row.email}
                    </div>
                  </td>
                  <td className="max-w-[14rem] truncate px-token-4 py-token-3">
                    {row.subject}
                  </td>
                  <td className="px-token-4 py-token-3">
                    {row.scope}
                    {row.slug ? (
                      <span className="text-muted-foreground"> · {row.slug}</span>
                    ) : null}
                  </td>
                  <td className="px-token-4 py-token-3">{row.status}</td>
                  <td className="px-token-4 py-token-3 text-right">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => setDeleteTarget(row)}
                    >
                      Delete
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        title="Delete inquiry?"
      >
        <p className="text-sm text-muted-foreground">
          Permanently remove this contact submission
          {deleteTarget ? ` from ${deleteTarget.email}` : ""}. This is logged
          for audit.
        </p>
        <div className="mt-token-4 flex justify-end gap-token-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => setDeleteTarget(null)}
          >
            Cancel
          </Button>
          <Button
            type="button"
            disabled={deleteOne.isPending || !deleteTarget}
            onClick={async () => {
              if (!deleteTarget) return;
              try {
                await deleteOne.mutateAsync(deleteTarget.id);
                toast({ title: "Inquiry deleted", tone: "success" });
                setDeleteTarget(null);
              } catch (err) {
                toast({
                  title:
                    err instanceof Error ? err.message : "Delete failed",
                  tone: "danger",
                });
              }
            }}
          >
            Delete
          </Button>
        </div>
      </Modal>

      <Modal
        open={Boolean(dsarEmail)}
        onClose={() => setDsarEmail(null)}
        title="Delete all inquiries for email?"
      >
        <p className="text-sm text-muted-foreground">
          This removes every contact inquiry stored for{" "}
          <span className="font-medium text-foreground">{dsarEmail}</span>.
          Use only for verified DSAR / deletion requests.
        </p>
        <div className="mt-token-4 flex justify-end gap-token-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => setDsarEmail(null)}
          >
            Cancel
          </Button>
          <Button
            type="button"
            disabled={deleteByEmail.isPending || !dsarEmail}
            onClick={async () => {
              if (!dsarEmail) return;
              try {
                const res = await deleteByEmail.mutateAsync(dsarEmail);
                const count =
                  res &&
                  typeof res === "object" &&
                  "deletedCount" in res
                    ? Number((res as { deletedCount: number }).deletedCount)
                    : 0;
                toast({
                  title: `Deleted ${count} inquir${count === 1 ? "y" : "ies"}`,
                  tone: "success",
                });
                setDsarEmail(null);
              } catch (err) {
                toast({
                  title:
                    err instanceof Error ? err.message : "Delete failed",
                  tone: "danger",
                });
              }
            }}
          >
            Delete all
          </Button>
        </div>
      </Modal>
    </div>
  );
}
