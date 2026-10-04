"use client";

import Link from "next/link";
import { useState } from "react";
import {
  ArrowUpRight,
  BadgeCheck,
  FileText,
  Megaphone,
  MessageCircle,
  Package,
  Store,
  Truck,
  Wallet,
} from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { buttonClasses } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Item, ItemActions, ItemContent, ItemDescription, ItemMedia, ItemTitle } from "@/components/ui/item";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

const subtle = "bg-[color-mix(in_oklab,var(--color-muted)_45%,transparent)]";
const accentTint = "bg-[color-mix(in_oklab,var(--color-accent)_14%,transparent)]";

const ORDERS = [
  { id: 1042, item: "Ankara midi skirt", amount: "₦18,500", status: "Paid", tone: "bg-emerald-500/15 text-emerald-400" },
  { id: 1043, item: "Adire tote bag", amount: "₦12,000", status: "Shipped", tone: "bg-sky-500/15 text-sky-400" },
  { id: 1044, item: "Beaded sandals", amount: "₦20,000", status: "Delivered", tone: "bg-white/10 text-zinc-300" },
];

const triggerClass = "truncate rounded-md px-1 text-[11px] font-medium sm:text-xs";

/** Example seller dashboard used on marketing pages. Figures are illustrative. */
export default function CardTabs({ className }: { className?: string }) {
  const [whatsapp, setWhatsapp] = useState(true);
  const [popup, setPopup] = useState(false);

  return (
    <Card className={cn("w-full overflow-hidden rounded-3xl border-white/5 bg-zinc-900/40 shadow-none backdrop-blur-sm", className)}>
      <Tabs defaultValue="overview" className="flex h-full w-full flex-col">
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3 space-y-0 border-0 px-6 pb-4 pt-6">
          <div>
            <CardTitle className="text-lg font-bold">Your seller dashboard</CardTitle>
            <p className="mt-1 text-xs text-muted-foreground">Example shop, sample figures</p>
          </div>
          <TabsList className="grid h-9 w-full grid-cols-3 rounded-lg sm:w-64">
            <TabsTrigger value="overview" className={triggerClass}>
              Overview
            </TabsTrigger>
            <TabsTrigger value="orders" className={triggerClass}>
              Orders
            </TabsTrigger>
            <TabsTrigger value="settings" className={triggerClass}>
              Settings
            </TabsTrigger>
          </TabsList>
        </CardHeader>

        <CardContent className="min-h-[15.5rem] flex-1 px-6">
          <TabsContent value="overview" className="mt-0 space-y-4">
            <div className={cn("flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border p-3.5", subtle)}>
              <div className="flex flex-1 items-center gap-3">
                <Avatar className="h-9 w-9 shrink-0 rounded-lg">
                  <AvatarFallback className={cn("rounded-lg text-accent-on-dark", accentTint)}>
                    <Store className="h-[18px] w-[18px]" aria-hidden />
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <p className="flex items-center gap-1 text-sm font-semibold text-foreground">
                    Lagos Loom
                    <BadgeCheck className="h-4 w-4 fill-[#1d9bf0] text-zinc-900" aria-label="Verified" />
                  </p>
                  <p className="text-xs text-muted-foreground">Shop is live</p>
                </div>
              </div>
              <span className="shrink-0 rounded-full border border-emerald-500/60 bg-emerald-500/10 px-2.5 py-0.5 text-xs font-semibold text-emerald-400">
                Verified seller
              </span>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-xs font-medium">
                <span className="text-muted-foreground">Live products on Yomi</span>
                <span className="text-foreground">38 of 50</span>
              </div>
              <Progress value={76} className="h-1.5" />
            </div>

            <div className="grid grid-cols-1 gap-2 pt-1 sm:grid-cols-2 sm:gap-3">
              <div className="rounded-lg border border-border p-3">
                <p className="text-xs text-muted-foreground">Orders this week</p>
                <div className="mt-1 flex flex-wrap items-baseline gap-1.5">
                  <span className="text-xl font-bold text-foreground">12</span>
                  <span className="flex shrink-0 items-center text-[11px] font-medium text-emerald-400">
                    3 new today <ArrowUpRight className="h-3 w-3" aria-hidden />
                  </span>
                </div>
              </div>
              <div className="rounded-lg border border-border p-3">
                <p className="text-xs text-muted-foreground">Waiting to ship</p>
                <div className="mt-1 flex flex-wrap items-baseline gap-1.5">
                  <span className="text-xl font-bold text-foreground">4</span>
                  <span className="shrink-0 text-[11px] font-medium text-muted-foreground">All paid</span>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="orders" className="mt-0 space-y-4">
            <div className={cn("flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border p-4", subtle)}>
              <div className="flex flex-1 items-center gap-3">
                <Avatar className="h-10 w-10 shrink-0 rounded-lg">
                  <AvatarFallback className="rounded-lg bg-accent-strong text-white shadow-sm">
                    <Wallet className="h-5 w-5" aria-hidden />
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-xs text-muted-foreground">Paid through Paystack this month</p>
                  <p className="font-display text-xl font-bold text-foreground sm:text-2xl">₦184,500</p>
                </div>
              </div>
              <p className="flex items-center gap-1 text-[11px] text-muted-foreground">
                <FileText className="h-3.5 w-3.5" aria-hidden />
                PDF invoice for every order
              </p>
            </div>

            <ul className="divide-y divide-border">
              {ORDERS.map((o) => (
                <li key={o.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                  <div className="flex min-w-0 items-center gap-2 text-muted-foreground">
                    {o.status === "Shipped" ? (
                      <Truck className="h-4 w-4 shrink-0" aria-hidden />
                    ) : (
                      <Package className="h-4 w-4 shrink-0" aria-hidden />
                    )}
                    <span className="truncate">
                      <span className="font-medium text-foreground">#{o.id}</span> {o.item}
                    </span>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <span className="hidden font-semibold text-foreground sm:inline">{o.amount}</span>
                    <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-semibold", o.tone)}>{o.status}</span>
                  </div>
                </li>
              ))}
            </ul>
          </TabsContent>

          <TabsContent value="settings" className="mt-0 space-y-3">
            <Item variant="outline" className="rounded-lg p-3.5">
              <ItemMedia variant="icon">
                <MessageCircle className="h-4 w-4 text-[#25d366]" aria-hidden />
              </ItemMedia>
              <ItemContent>
                <ItemTitle className="text-sm font-medium text-foreground">WhatsApp order alerts</ItemTitle>
                <ItemDescription className="text-xs">A message on your phone for every new order</ItemDescription>
              </ItemContent>
              <ItemActions>
                <Switch checked={whatsapp} onCheckedChange={setWhatsapp} aria-label="WhatsApp order alerts" />
              </ItemActions>
            </Item>
            <Item variant="outline" className="rounded-lg p-3.5">
              <ItemMedia variant="icon">
                <Megaphone className="h-4 w-4 text-accent-on-dark" aria-hidden />
              </ItemMedia>
              <ItemContent>
                <ItemTitle className="text-sm font-medium text-foreground">Promo pop-up</ItemTitle>
                <ItemDescription className="text-xs">Show your latest offer when shoppers visit</ItemDescription>
              </ItemContent>
              <ItemActions>
                <Switch checked={popup} onCheckedChange={setPopup} aria-label="Promo pop-up" />
              </ItemActions>
            </Item>
          </TabsContent>
        </CardContent>

        <CardFooter className="flex flex-wrap justify-end gap-2 border-0 px-6 pb-6 pt-0">
          <Link href="/sellers#features" className={buttonClasses("ghost", "md", "text-xs sm:text-sm")}>
            All seller features
          </Link>
          <Link href="/onboarding" className={buttonClasses("primary", "md", "text-xs sm:text-sm")}>
            Create your shop
          </Link>
        </CardFooter>
      </Tabs>
    </Card>
  );
}
