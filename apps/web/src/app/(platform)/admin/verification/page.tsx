"use client";

import { useState } from "react";
import type { VerificationRequestPublic } from "@vendors/shared-types";
import { Filter, ShieldCheck } from "lucide-react";
import { PageHeader } from "@/components/dashboard/page-header";
import { EmptyState, QueryErrorState } from "@/components/empty-state";
import { SkeletonLines } from "@/components/skeleton";
import { Button } from "@/components/ui/button";
import { Label, Textarea } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { Select } from "@/components/ui/select";
import { useToast } from "@/components/ui/toast";
import {
  useAdminVerification,
  useReviewVerification,
} from "@/hooks/use-admin";

export default function AdminVerificationPage() {
  const [status, setStatus] = useState("pending");
  const { data: requests = [], isLoading, error, refetch } =
    useAdminVerification(status);
  const review = useReviewVerification();
  const { toast } = useToast();

  const [rejectTarget, setRejectTarget] =
    useState<VerificationRequestPublic | null>(null);
  const [reason, setReason] = useState("");
  const [approveTarget, setApproveTarget] =
    useState<VerificationRequestPublic | null>(null);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Verification queue"
        description="Review shop documents. Approve flips verified badge + active status."
        icon={ShieldCheck}
        actions={
          <div className="w-full min-w-[12rem] max-w-[14rem]">
            <Select
              icon={<Filter />}
              value={status}
              onChange={(e) => setStatus(e.target.value)}
            >
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
              <option value="">All</option>
            </Select>
          </div>
        }
      />

      {error ? (
        <QueryErrorState
          error={error}
          onRetry={() => {
            void refetch();
          }}
          sellerHomeHref="/admin"
        />
      ) : isLoading ? (
        <SkeletonLines count={4} />
      ) : requests.length === 0 ? (
        <EmptyState
          kind="empty"
          title="Queue is empty"
          description={
            status === "pending"
              ? "No pending verification requests right now."
              : "No requests for this filter."
          }
        />
      ) : (
        <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
          {requests.map((r) => (
            <li key={r.id} className="space-y-3 px-4 py-4 text-sm">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="space-y-1">
                  <p className="font-medium text-foreground">
                    {r.tenant?.name ?? "Shop"}
                  </p>
                  <p className="text-muted-foreground">
                    Submitted {new Date(r.createdAt).toLocaleString()} ·{" "}
                    <span className="capitalize">{r.status}</span>
                  </p>
                </div>
                {r.status === "pending" && (
                  <div className="flex gap-2">
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => setApproveTarget(r)}
                    >
                      Approve
                    </Button>
                    <Button
                      variant="danger"
                      size="sm"
                      onClick={() => {
                        setReason("");
                        setRejectTarget(r);
                      }}
                    >
                      Reject
                    </Button>
                  </div>
                )}
              </div>
              <ul className="flex flex-wrap gap-3">
                {r.submittedDocs.map((d) => (
                  <li key={d.url}>
                    <a
                      href={d.url}
                      target="_blank"
                      rel="noreferrer"
                      className="font-medium text-accent transition hover:text-accent-deep dark:text-accent-on-dark"
                    >
                      {d.name}
                    </a>
                  </li>
                ))}
              </ul>
              {r.note && (
                <p className="text-muted-foreground">Note: {r.note}</p>
              )}
            </li>
          ))}
        </ul>
      )}

      <Modal
        open={!!approveTarget}
        onClose={() => setApproveTarget(null)}
        title="Approve verification?"
        footer={
          <>
            <Button variant="ghost" onClick={() => setApproveTarget(null)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              disabled={review.isPending}
              onClick={() => {
                if (!approveTarget) return;
                review.mutate(
                  { id: approveTarget.id, decision: "approve" },
                  {
                    onSuccess: () => {
                      setApproveTarget(null);
                      toast({
                        title: "Shop verified",
                        tone: "success",
                      });
                    },
                  }
                );
              }}
            >
              Approve
            </Button>
          </>
        }
      >
        <p>
          Approve “{approveTarget?.tenant?.name}”? This sets{" "}
          <strong>verified badge</strong> and status to <strong>active</strong>.
        </p>
      </Modal>

      <Modal
        open={!!rejectTarget}
        onClose={() => setRejectTarget(null)}
        title="Reject verification"
        footer={
          <>
            <Button variant="ghost" onClick={() => setRejectTarget(null)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              disabled={review.isPending || !reason.trim()}
              onClick={() => {
                if (!rejectTarget) return;
                review.mutate(
                  {
                    id: rejectTarget.id,
                    decision: "reject",
                    note: reason.trim(),
                  },
                  {
                    onSuccess: () => {
                      setRejectTarget(null);
                      toast({
                        title: "Request rejected",
                        description:
                          "Seller notified by email when configured.",
                        tone: "default",
                      });
                    },
                  }
                );
              }}
            >
              Reject
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <p>
            Reject “{rejectTarget?.tenant?.name}”? A reason is required and will
            be emailed to the seller.
          </p>
          <Label>
            <span>Reason</span>
            <Textarea
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Why this request was rejected…"
              required
            />
          </Label>
        </div>
      </Modal>
    </div>
  );
}
