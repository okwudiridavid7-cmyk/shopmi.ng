"use client";

import { useState } from "react";
import type { UserRole } from "@vendors/shared-types";
import { EmptyState } from "@/components/empty-state";
import { SkeletonLines } from "@/components/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
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
  const { data: users = [], isLoading, error } = useAdminUsers(q, role);
  const changeRole = useChangeUserRole();
  const { toast } = useToast();

  const [target, setTarget] = useState<AdminUserRow | null>(null);
  const [nextRole, setNextRole] = useState<UserRole>("buyer");

  return (
    <div className="space-y-token-4">
      <div>
        <h1 className="font-display text-2xl text-foreground">Users</h1>
        <p className="mt-token-1 text-sm text-muted-foreground">
          Platform accounts — filter by role and change roles carefully.
        </p>
      </div>

      <div className="flex flex-wrap gap-token-3">
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search name or email…"
          className="max-w-xs"
        />
        <select
          className="rounded-md border border-border bg-card px-token-3 py-token-2 text-sm"
          value={role}
          onChange={(e) => setRole(e.target.value)}
        >
          <option value="">All roles</option>
          {ROLES.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>
      </div>

      {error ? (
        <p className="text-sm text-muted-foreground">
          {error instanceof Error ? error.message : "Failed to load"}
        </p>
      ) : isLoading ? (
        <SkeletonLines count={5} />
      ) : users.length === 0 ? (
        <EmptyState
          title="No users match"
          description="Try a different search or role filter."
        />
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border bg-card">
          <table className="w-full min-w-[40rem] text-left text-sm">
            <thead className="border-b border-border text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-token-4 py-token-3 font-medium">Name</th>
                <th className="px-token-4 py-token-3 font-medium">Email</th>
                <th className="px-token-4 py-token-3 font-medium">Role</th>
                <th className="px-token-4 py-token-3 font-medium">Signup</th>
                <th className="px-token-4 py-token-3 font-medium">Created</th>
                <th className="px-token-4 py-token-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {users.map((u) => (
                <tr key={u.id}>
                  <td className="px-token-4 py-token-3 font-medium">
                    {u.name || "—"}
                  </td>
                  <td className="px-token-4 py-token-3 text-muted-foreground">
                    {u.email}
                  </td>
                  <td className="px-token-4 py-token-3 capitalize">{u.role}</td>
                  <td className="px-token-4 py-token-3 capitalize text-muted-foreground">
                    {u.signupMethod}
                  </td>
                  <td className="px-token-4 py-token-3 text-muted-foreground">
                    {new Date(u.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-token-4 py-token-3">
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
        <div className="space-y-token-3">
          <p>
            Change role for <strong>{target?.email}</strong> from{" "}
            <strong>{target?.role}</strong> to:
          </p>
          <select
            className="w-full rounded-md border border-border bg-card px-token-3 py-token-2 text-sm"
            value={nextRole}
            onChange={(e) => setNextRole(e.target.value as UserRole)}
          >
            {ROLES.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
          <p className="text-xs text-muted-foreground">
            This is a sensitive action enforced server-side for super_admin only.
          </p>
        </div>
      </Modal>
    </div>
  );
}
