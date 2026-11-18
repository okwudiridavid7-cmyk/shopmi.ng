"use client";

import { FormEvent, useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { BriefcaseBusiness } from "lucide-react";
import { PageHeader } from "@/components/dashboard/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Label } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { useToast } from "@/components/ui/toast";
import { apiFetch } from "@/lib/api";

type Answers = {
  categoryFocus?: string;
  sellingExperience?: string;
  fulfillmentMethod?: string;
  weeklyOrders?: string;
  currencies?: string[];
  staffCount?: string;
  physicalStores?: string;
};

export default function SellerSetupPage() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const setup = useQuery({ queryKey: ["seller", "setup"], queryFn: () => apiFetch<{ answers: Answers }>("/api/seller/setup") });
  const [answers, setAnswers] = useState<Answers>({ currencies: ["NGN"] });
  const [busy, setBusy] = useState(false);

  useEffect(() => { if (setup.data?.answers) setAnswers({ currencies: ["NGN"], ...setup.data.answers }); }, [setup.data]);

  async function save(e: FormEvent) {
    e.preventDefault(); setBusy(true);
    try {
      await apiFetch("/api/seller/setup", { method: "PATCH", body: JSON.stringify(answers) });
      await Promise.all([
        qc.invalidateQueries({ queryKey: ["seller", "setup"] }),
        qc.invalidateQueries({ queryKey: ["seller", "shop"] }),
      ]);
      toast({ title: "Business profile saved", description: "You can come back to update these details any time.", tone: "success" });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Could not save your business profile.";
      toast({ title: "Could not save profile", description: message, tone: "danger" });
    } finally { setBusy(false); }
  }

  const field = (key: keyof Answers, label: string, options: [string, string][]) => <Label key={key}><span className="text-sm font-medium">{label}</span><Select required value={String(answers[key] ?? "")} onChange={(e) => setAnswers((a) => ({ ...a, [key]: e.target.value }))} className="mt-2 h-11"><option value="" disabled>Choose an option</option>{options.map(([value, title]) => <option key={value} value={value}>{title}</option>)}</Select></Label>;

  return <div className="mx-auto max-w-3xl space-y-6">
    <PageHeader title="Business profile" description="Complete this at your own pace. You can return to any setup step whenever you need." icon={BriefcaseBusiness} />
    <Card className="rounded-2xl"><CardHeader><h2 className="text-sm font-semibold">About your business</h2><p className="mt-1 text-sm text-muted-foreground">These answers help tailor your shop tools and fulfillment options.</p></CardHeader><CardBody><form onSubmit={save} className="space-y-5">
      <div className="grid gap-5 sm:grid-cols-2">
        {field("sellingExperience", "Selling experience", [["first_time", "I’m new to selling"], ["some", "I have some experience"], ["pro", "I sell professionally"]])}
        {field("fulfillmentMethod", "How will you fulfill orders?", [["self_ship", "I’ll deliver or ship orders"], ["pickup", "Customers will pick up"], ["courier", "I’ll use a courier"]])}
        {field("weeklyOrders", "Expected weekly orders", [["0-50", "0–50 orders"], ["51-100", "51–100 orders"], ["101-1000", "101–1,000 orders"], ["1001+", "More than 1,000"]])}
        {field("staffCount", "Team size", [["none", "Just me"], ["1-3", "1–3 people"], ["4-5", "4–5 people"], ["6-10", "6–10 people"], ["11+", "11 or more"]])}
        {field("physicalStores", "Physical shop locations", [["none", "Online only"], ["1", "1 location"], ["2", "2 locations"], ["3", "3 locations"], ["4+", "4 or more"]])}
        {field("categoryFocus", "Main product category", [["fashion", "Fashion"], ["beauty", "Beauty and personal care"], ["home", "Home and living"], ["electronics", "Electronics"], ["food", "Food and groceries"], ["other", "Other"]])}
      </div>
      <fieldset className="space-y-2"><legend className="text-sm font-medium">Currencies you plan to use</legend><div className="flex flex-wrap gap-2">{[["NGN", "NGN"], ["USD", "USD"], ["GBP", "GBP"], ["KES", "KES"]].map(([code, label]) => <label key={code} className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm"><input type="checkbox" checked={(answers.currencies ?? []).includes(code)} onChange={(e) => setAnswers((a) => ({ ...a, currencies: e.target.checked ? [...new Set([...(a.currencies ?? []), code])] : (a.currencies ?? []).filter((v) => v !== code) }))} />{label}</label>)}</div></fieldset>
      <div className="flex flex-wrap justify-end gap-2"><Button type="button" variant="outline" onClick={() => { window.location.href = "/seller"; }}>Back to dashboard</Button><Button type="submit" disabled={busy}>{busy ? "Saving…" : "Save business profile"}</Button></div>
    </form></CardBody></Card>
  </div>;
}
