import type { LucideIcon } from "lucide-react";
import { QuickActions } from "@/components/dashboard/quick-actions";

export type AdminAction = {
  href: string;
  label: string;
  icon: LucideIcon;
  variant?: "primary" | "outline" | "secondary";
};

export function AdminActionStrip({ actions }: { actions: AdminAction[] }) {
  return <QuickActions actions={actions} layout="row" />;
}
