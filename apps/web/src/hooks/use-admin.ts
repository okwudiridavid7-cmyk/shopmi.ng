"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  AdminOverview,
  PlanPublic,
  PlatformSetting,
  UserPublic,
  UserRole,
  VerificationRequestPublic,
} from "@vendors/shared-types";
import { apiFetch } from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";

export type AdminTenantRow = {
  id: string;
  name: string;
  slug: string;
  status: string;
  verifiedBadge: boolean;
  createdAt: string;
  location: string | null;
  plan: { id: string; name: string; slug: string; productLimit: number | null } | null;
  ownerEmail: string;
  ownerName: string | null;
  ownerPhone?: string | null;
  productCount: number;
  orderCount: number;
};

export type AdminTenantDetail = AdminTenantRow & {
  owner: UserPublic;
  salesTotal: number;
  currency: string;
  themeSettings: Record<string, unknown> | null;
  customDomain: string | null;
  recentOrders: {
    id: string;
    status: string;
    total: number;
    currency: string;
    createdAt: string;
    buyerEmail: string;
    buyerName: string | null;
  }[];
  verificationRequests: {
    id: string;
    status: string;
    submittedDocs: { name: string; url: string }[];
    note: string | null;
    createdAt: string;
    reviewedAt: string | null;
  }[];
};

export type AdminUserRow = UserPublic & {
  signupMethod: "email" | "google";
};

const OVERVIEW_POLL_MS = 4 * 60 * 1000;

export function useAdminOverview(period: "today" | "week" | "month") {
  return useQuery({
    queryKey: queryKeys.admin.overview(period),
    queryFn: async () => {
      const res = await apiFetch<{ overview: AdminOverview }>(
        `/api/admin/overview?period=${period}`
      );
      return res.overview;
    },
    refetchInterval: OVERVIEW_POLL_MS,
  });
}

export function useAdminTenants(q: string, status: string) {
  const qs = `q=${encodeURIComponent(q)}&status=${encodeURIComponent(status)}`;
  return useQuery({
    queryKey: queryKeys.admin.tenants(qs),
    queryFn: async () => {
      const res = await apiFetch<{ tenants: AdminTenantRow[] }>(
        `/api/admin/tenants?${qs}`
      );
      return res.tenants;
    },
  });
}

export function useAdminTenant(id: string) {
  return useQuery({
    queryKey: queryKeys.admin.tenant(id),
    queryFn: async () => {
      const res = await apiFetch<{ tenant: AdminTenantDetail }>(
        `/api/admin/tenants/${id}`
      );
      return res.tenant;
    },
    enabled: !!id,
  });
}

export function usePatchTenant() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      status,
      verifiedBadge,
    }: {
      id: string;
      status?: string;
      verifiedBadge?: boolean;
    }) =>
      apiFetch(`/api/admin/tenants/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ status, verifiedBadge }),
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["admin", "tenants"] });
      void qc.invalidateQueries({ queryKey: ["admin", "overview"] });
    },
  });
}

export function useAdminUsers(q: string, role: string) {
  const qs = `q=${encodeURIComponent(q)}&role=${encodeURIComponent(role)}`;
  return useQuery({
    queryKey: queryKeys.admin.users(qs),
    queryFn: async () => {
      const res = await apiFetch<{ users: AdminUserRow[] }>(
        `/api/admin/users?${qs}`
      );
      return res.users;
    },
  });
}

export function useChangeUserRole() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, role }: { id: string; role: UserRole }) =>
      apiFetch(`/api/admin/users/${id}/role`, {
        method: "PATCH",
        body: JSON.stringify({ role }),
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["admin", "users"] });
    },
  });
}

export function useAdminVerification(status = "pending") {
  return useQuery({
    queryKey: queryKeys.admin.verification(status),
    queryFn: async () => {
      const res = await apiFetch<{ requests: VerificationRequestPublic[] }>(
        `/api/admin/verification-requests?status=${encodeURIComponent(status)}`
      );
      return res.requests;
    },
  });
}

export function useReviewVerification() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      decision,
      note,
    }: {
      id: string;
      decision: "approve" | "reject";
      note?: string;
    }) =>
      apiFetch(`/api/admin/verification-requests/${id}/review`, {
        method: "POST",
        body: JSON.stringify({ decision, note }),
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["admin", "verification"] });
      void qc.invalidateQueries({ queryKey: ["admin", "tenants"] });
      void qc.invalidateQueries({ queryKey: ["admin", "overview"] });
    },
  });
}

export function useAdminSettings() {
  return useQuery({
    queryKey: queryKeys.admin.settings,
    queryFn: async () => {
      const res = await apiFetch<{ settings: PlatformSetting[] }>(
        "/api/platform-settings"
      );
      return res.settings;
    },
  });
}

export function useSaveAdminSettings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (settings: { key: string; value: string }[]) =>
      apiFetch("/api/platform-settings", {
        method: "PUT",
        body: JSON.stringify({ settings }),
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.admin.settings });
      void qc.invalidateQueries({ queryKey: ["platform", "branding"] });
    },
  });
}

export function useAdminPlans() {
  return useQuery({
    queryKey: queryKeys.admin.plans,
    queryFn: async () => {
      const res = await apiFetch<{ plans: PlanPublic[] }>("/api/admin/plans");
      return res.plans;
    },
  });
}

export function useInvalidateAdminPlans() {
  const qc = useQueryClient();
  return () => void qc.invalidateQueries({ queryKey: queryKeys.admin.plans });
}

export type AdminContactInquiryRow = {
  id: string;
  scope: "platform" | "shop";
  tenantId: string | null;
  slug: string | null;
  name: string;
  email: string;
  phone: string | null;
  subject: string;
  message: string;
  status: string;
  providerMessageId: string | null;
  error: string | null;
  expiresAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export function useAdminContactInquiries(email: string, q: string) {
  const qs = `email=${encodeURIComponent(email)}&q=${encodeURIComponent(q)}&limit=50`;
  return useQuery({
    queryKey: queryKeys.admin.contactInquiries(qs),
    queryFn: async () => {
      const res = await apiFetch<{ inquiries: AdminContactInquiryRow[] }>(
        `/api/admin/contact-inquiries?${qs}`
      );
      return res.inquiries;
    },
  });
}

export function useDeleteContactInquiry() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiFetch(`/api/admin/contact-inquiries/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      void qc.invalidateQueries({
        queryKey: ["admin", "contact-inquiries"],
      });
    },
  });
}

export function useDeleteContactInquiriesByEmail() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (email: string) =>
      apiFetch(
        `/api/admin/contact-inquiries?email=${encodeURIComponent(email)}`,
        { method: "DELETE" }
      ),
    onSuccess: () => {
      void qc.invalidateQueries({
        queryKey: ["admin", "contact-inquiries"],
      });
    },
  });
}
