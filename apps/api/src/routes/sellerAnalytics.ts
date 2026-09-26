import { Router } from "express";
import { prisma } from "../db/prisma";
import { requireAuth } from "../auth/middleware";
import { requireTenantFromMembership } from "../tenant/middleware";
import { tenantWhere } from "../tenant/tenantContext";
import { decimalToNumber } from "../lib/serialize";

export const sellerAnalyticsRouter = Router();

sellerAnalyticsRouter.use(requireAuth, requireTenantFromMembership());

type Period = "today" | "week" | "month";

function periodStart(period: Period): { since: Date; days: number } {
  const since = new Date();
  if (period === "today") {
    since.setHours(0, 0, 0, 0);
    return { since, days: 1 };
  }
  if (period === "week") {
    since.setDate(since.getDate() - 7);
    return { since, days: 7 };
  }
  since.setDate(since.getDate() - 30);
  return { since, days: 30 };
}

function dayBounds(day: string): { since: Date; until: Date; days: number } {
  return {
    since: new Date(`${day}T00:00:00.000`),
    until: new Date(`${day}T23:59:59.999`),
    days: 1,
  };
}

sellerAnalyticsRouter.get("/", async (req, res, next) => {
  try {
    const raw = String(req.query.period ?? "month");
    const period: Period =
      raw === "today" || raw === "week" || raw === "month" ? raw : "month";
    const day = String(req.query.day ?? "").trim();
    const tenantId = req.tenant!.tenantId;

    let since: Date;
    let until: Date | undefined;
    let days: number;
    if (day && /^\d{4}-\d{2}-\d{2}$/.test(day)) {
      const bounds = dayBounds(day);
      since = bounds.since;
      until = bounds.until;
      days = bounds.days;
    } else {
      const bounds = periodStart(period);
      since = bounds.since;
      until = undefined;
      days = bounds.days;
    }

    const orders = await prisma.order.findMany({
      where: {
        tenantId,
        createdAt: until ? { gte: since, lte: until } : { gte: since },
      },
      include: {
        items: { include: { product: { select: { id: true, title: true } } } },
      },
      orderBy: { createdAt: "asc" },
    });

    const paid = orders.filter(
      (o) => o.status === "paid" || o.status === "fulfilled"
    );
    const pending = orders.filter((o) => o.status === "pending_payment");

    const salesTotal = paid.reduce((s, o) => s + decimalToNumber(o.total), 0);
    const currency = paid[0]?.currency ?? orders[0]?.currency ?? "NGN";

    const byDayMap = new Map<
      string,
      { date: string; revenue: number; orders: number }
    >();
    for (const o of paid) {
      const date = o.createdAt.toISOString().slice(0, 10);
      const row = byDayMap.get(date) ?? { date, revenue: 0, orders: 0 };
      row.revenue += decimalToNumber(o.total);
      row.orders += 1;
      byDayMap.set(date, row);
    }
    const salesOverTime = Array.from(byDayMap.values());

    const productSales = new Map<
      string,
      { productId: string; title: string; qty: number; revenue: number }
    >();
    for (const o of paid) {
      for (const item of o.items) {
        const existing = productSales.get(item.productId) ?? {
          productId: item.productId,
          title: item.product.title,
          qty: 0,
          revenue: 0,
        };
        existing.qty += item.qty;
        existing.revenue += decimalToNumber(item.unitPrice) * item.qty;
        productSales.set(item.productId, existing);
      }
    }
    const topProducts = Array.from(productSales.values())
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);

    const checkoutAttempts = paid.length + pending.length;
    const conversionRate =
      checkoutAttempts === 0
        ? 0
        : Math.round((paid.length / checkoutAttempts) * 1000) / 10;

    const productCount = await prisma.product.count({
      where: tenantWhere(req.tenant!),
    });

    return res.json({
      analytics: {
        period: day && /^\d{4}-\d{2}-\d{2}$/.test(day) ? "today" : period,
        day: day && /^\d{4}-\d{2}-\d{2}$/.test(day) ? day : null,
        periodDays: days,
        currency,
        totals: {
          revenue: salesTotal,
          orderCount: paid.length,
          productCount,
          conversionRate,
          pendingOrderCount: pending.length,
          allOrderCount: orders.length,
        },
        salesOverTime,
        topProducts,
      },
    });
  } catch (err) {
    return next(err);
  }
});
