"use client";

import { useState } from "react";
import type { UserRole } from "@vendors/shared-types";
import { Filter, Search, ShieldCheck, Users } from "lucide-react";
import { PageHeader } from "@/components/dashboard/page-header";
import { EmptyState, QueryErrorState } from "@/components/empty-state";
import { SkeletonLines } from "@/components/skeleton";
import { Button } from "@/components/ui/button";
import { InputWithIcon } from "@/components/ui/input-with-icon";
import { Modal } from "@/components/ui/modal";
import { Select } from "@/components/ui/select";
import { useToast } from "@/components/ui/toast";
import {
  type AdminUserRow,
  useAdminUsers,
  useChangeUserRole,
} from "@/hooks/use-admin";

const ROLES: UserRole[] = [
  "buyer",
  "seller",
  "tenant_admin",
  "super_admin",
];

export default function AdminUsersPage() {
  const [q, setQ] = useState("");
  const [role, setRole] = useState("");
  const { data: users = [], isLoading, error, refetch } = useAdminUsers(
    q,
    role
  );
  const changeRole = useChangeUserRole();
  const { toast } = useToast();

  const [target, setTarget] = useState<AdminUserRow | null>(null);
  const [nextRole, setNextRole] = useState<UserRole>("buyer");

  return (
    <div className="space-y-6">
      <PageHeader
        title="Users"
        description="Platform accounts — filter by role and change roles carefully."
        icon={Users}
      />

      <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-border bg-muted/30 p-3">
        <div className="w-full max-w-xs">
          <InputWithIcon
            icon={<Search />}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search name or email…"
          />
        </div>
        <div className="w-full max-w-[14rem]">
          <Select
            icon={<Filter />}
            value={role}
            onChange={(e) => setRole(e.target.value)}
          >
            <option value="">All roles</option>
            {ROLES.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </Select>
        </div>
      </div>

      {error ? (
        <QueryErrorState
          error={error}
          onRetry={() => {
            void refetch();
          }}
          sellerHomeHref="/admin"
        />
      ) : isLoading ? (
        <SkeletonLines count={5} />
      ) : users.length === 0 ? (
        <EmptyState
          kind={q || role ? "empty_filtered" : "users"}
          title={q || role ? "No users match" : undefined}
          description={
            q || role ? "Try a different search or role filter." : undefined
          }
        />
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-border bg-card shadow-sm">
          <table className="w-full min-w-[40rem] text-left text-sm">
            <thead className="border-b border-border bg-muted/30 text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Email</th>
                <th className="px-4 py-3 font-medium">Role</th>
                <th className="px-4 py-3 font-medium">Signup</th>
                <th className="px-4 py-3 font-medium">Created</th>
                <th className="px-4 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {users.map((u) => (
                <tr key={u.id} className="hover:bg-muted/20">
                  <td className="px-4 py-3 font-medium">{u.name || "—"}</td>
                  <td className="px-4 py-3 text-muted-foreground">{u.email}</td>
                  <td className="px-4 py-3 capitalize">{u.role}</td>
                  <td className="px-4 py-3 capitalize text-muted-foreground">
                    {u.signupMethod}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {new Date(u.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setTarget(u);
                        setNextRole(u.role);
                      }}
                    >
                      Change role
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal
        open={!!target}
        onClose={() => setTarget(null)}
        title="Change user role"
        footer={
          <>
            <Button variant="ghost" onClick={() => setTarget(null)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              disabled={
                changeRole.isPending || !target || nextRole === target.role
              }
              onClick={() => {
                if (!target) return;
                changeRole.mutate(
                  { id: target.id, role: nextRole },
                  {
                    onSuccess: () => {
                      setTarget(null);
                      toast({
                        title: "Role updated",
                        tone: "success",
                      });
                    },
                    onError: (err) => {
                      toast({
                        title: "Could not change role",
                        description:
                          err instanceof Error ? err.message : "Failed",
                        tone: "danger",
                      });
                    },
                  }
                );
              }}
            >
              Confirm change
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <p>
            Change role for <strong>{target?.email}</strong> from{" "}
            <strong>{target?.role}</strong> to:
          </p>
          <Select
            icon={<ShieldCheck />}
            value={nextRole}
            onChange={(e) => setNextRole(e.target.value as UserRole)}
          >
            {ROLES.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </Select>
          <p className="text-xs text-muted-foreground">
            This is a sensitive action enforced server-side for super_admin only.
          </p>
        </div>
      </Modal>
    </div>
  );
}
