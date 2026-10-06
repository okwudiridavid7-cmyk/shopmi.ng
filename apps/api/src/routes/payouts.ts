import { Router } from "express";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "../db/prisma";
import { requireAuth, requireRoles } from "../auth/middleware";
import { requireTenantFromMembership, requireTenantRoles } from "../tenant/middleware";
import { redisRateLimit } from "../lib/rateLimit";
import { decimalToNumber } from "../lib/serialize";
import { alertAdmins } from "../services/adminAlerts";
import { PaystackError, paystackConfigured, paystackRequest } from "../services/paystack";
import { ensurePaystackSubaccount } from "../services/paystackSubaccount";

export const sellerPayoutsRouter = Router();
export const adminPayoutsRouter = Router();

sellerPayoutsRouter.use(requireAuth, requireTenantFromMembership());
adminPayoutsRouter.use(requireAuth, requireRoles("super_admin"));

const resolveLimiter = redisRateLimit({
  name: "bank-resolve",
  windowMs: 60 * 60 * 1000,
  max: 20,
  by: "tenant",
  message: "Too many account lookups. Try again later.",
});

type Bank = { code: string; name: string };
let bankCache: { at: number; banks: Bank[] } | null = null;

async function listBanks(): Promise<Bank[]> {
  if (bankCache && Date.now() - bankCache.at < 12 * 3600 * 1000) return bankCache.banks;
  const data = await paystackRequest<{ code: string; name: string; active?: boolean }[]>(
    "/bank?country=nigeria&currency=NGN&perPage=200"
  );
  const banks = data
    .filter((b) => b.active !== false && b.code)
    .map((b) => ({ code: b.code, name: b.name }))
    .sort((a, b) => a.name.localeCompare(b.name));
  bankCache = { at: Date.now(), banks };
  return banks;
}

async function resolveAccount(bankCode: string, accountNumber: string): Promise<string> {
  const data = await paystackRequest<{ account_name: string }>(
    `/bank/resolve?account_number=${encodeURIComponent(accountNumber)}&bank_code=${encodeURIComponent(bankCode)}`
  );
  return data.account_name;
}

const bankBody = z.object({
  bankCode: z.string().regex(/^[0-9A-Za-z-]{2,20}$/),
  accountNumber: z.string().regex(/^\d{10}$/, "Account number must be 10 digits"),
});

const mask = (acct: string | null) => (acct ? `******${acct.slice(-4)}` : "none");

sellerPayoutsRouter.get("/banks", requireTenantRoles("owner"), async (_req, res, next) => {
  try {
    if (!paystackConfigured()) return res.json({ banks: [] });
    return res.json({ banks: await listBanks() });
  } catch (err) {
    if (err instanceof PaystackError) return res.status(502).json({ error: "Could not load banks" });
    return next(err);
  }
});

sellerPayoutsRouter.post("/bank/resolve", requireTenantRoles("owner"), resolveLimiter, async (req, res, next) => {
  try {
    const body = bankBody.parse(req.body);
    const accountName = await resolveAccount(body.bankCode, body.accountNumber);
    return res.json({ accountName });
  } catch (err) {
    if (err instanceof z.ZodError) return res.status(400).json({ error: err.issues[0]?.message ?? "Invalid details" });
    if (err instanceof PaystackError) {
      return res.status(400).json({ error: "We couldn't find that account. Check the bank and number." });
    }
    return next(err);
  }
});

/**
 * Owner sets the payout account. The name comes from Paystack, never from the client,
 * and an existing subaccount is moved to the new account in the same step.
 */
sellerPayoutsRouter.put("/bank", requireTenantRoles("owner"), resolveLimiter, async (req, res, next) => {
  try {
    const body = bankBody.parse(req.body);
    const tenant = await prisma.tenant.findUniqueOrThrow({ where: { id: req.tenant!.tenantId } });
    if (!paystackConfigured()) return res.status(503).json({ error: "Payouts are not available right now" });

    let accountName: string;
    try {
      accountName = await resolveAccount(body.bankCode, body.accountNumber);
    } catch {
      return res.status(400).json({ error: "We couldn't find that account. Check the bank and number." });
    }

    if (tenant.paystackSubaccountCode) {
      try {
        await paystackRequest(`/subaccount/${encodeURIComponent(tenant.paystackSubaccountCode)}`, {
          method: "PUT",
          body: { settlement_bank: body.bankCode, account_number: body.accountNumber },
        });
      } catch (err) {
        const message = err instanceof PaystackError ? err.message : "unknown error";
        return res.status(502).json({ error: `Paystack could not update your payout account: ${message}` });
      }
    }

    const changed =
      tenant.settlementBankCode !== body.bankCode || tenant.settlementAccountNumber !== body.accountNumber;
    await prisma.tenant.update({
      where: { id: tenant.id },
      data: {
        settlementBankCode: body.bankCode,
        settlementAccountNumber: body.accountNumber,
        settlementAccountName: accountName,
      },
    });
    if (tenant.verifiedBadge && !tenant.paystackSubaccountCode) {
      await ensurePaystackSubaccount(tenant.id);
    }

    if (changed && tenant.settlementAccountNumber) {
      await alertAdmins({
        title: "Seller bank details changed",
        lines: [
          `${tenant.name} (${tenant.slug}) changed their payout account.`,
          `From ${tenant.settlementBankCode ?? "?"} ${mask(tenant.settlementAccountNumber)} to ${body.bankCode} ${mask(body.accountNumber)} (${accountName}).`,
          `Changed by user ${req.user!.id}. Hold manual payouts if this looks wrong.`,
        ],
        path: "/admin/payouts",
      });
    }

    return res.json({
      settlementBankCode: body.bankCode,
      settlementAccountNumber: body.accountNumber,
      settlementAccountName: accountName,
    });
  } catch (err) {
    if (err instanceof z.ZodError) return res.status(400).json({ error: err.issues[0]?.message ?? "Invalid details" });
    return next(err);
  }
});

type Balance = { currency: string; amount: number };

function toBalances(rows: { currency: string; _sum: { amount: Prisma.Decimal | null } }[]): Balance[] {
  return rows
    .map((r) => ({ currency: r.currency, amount: decimalToNumber(r._sum.amount ?? 0) }))
    .filter((b) => Math.abs(b.amount) >= 0.01);
}

function toEntry(e: {
  id: string;
  kind: string;
  amount: Prisma.Decimal;
  currency: string;
  reference: string | null;
  note: string | null;
  orderId: string | null;
  createdAt: Date;
}) {
  return {
    id: e.id,
    kind: e.kind,
    amount: decimalToNumber(e.amount),
    currency: e.currency,
    reference: e.reference,
    note: e.note,
    orderId: e.orderId,
    createdAt: e.createdAt.toISOString(),
  };
}

/** What the platform holds for this shop from sales that were not split to a subaccount. */
sellerPayoutsRouter.get("/", requireTenantRoles("owner", "manager"), async (req, res, next) => {
  try {
    const tenantId = req.tenant!.tenantId;
    const [tenant, sums, entries] = await Promise.all([
      prisma.tenant.findUniqueOrThrow({
        where: { id: tenantId },
        select: { verifiedBadge: true, paystackSubaccountCode: true, settlementAccountName: true },
      }),
      prisma.sellerLedgerEntry.groupBy({ by: ["currency"], where: { tenantId }, _sum: { amount: true } }),
      prisma.sellerLedgerEntry.findMany({ where: { tenantId }, orderBy: { createdAt: "desc" }, take: 100 }),
    ]);
    return res.json({
      balances: toBalances(sums),
      entries: entries.map(toEntry),
      directPayouts: Boolean(tenant.verifiedBadge && tenant.paystackSubaccountCode),
      accountName: tenant.settlementAccountName,
    });
  } catch (err) {
    return next(err);
  }
});

async function adminBalances() {
  const sums = await prisma.sellerLedgerEntry.groupBy({
    by: ["tenantId", "currency"],
    _sum: { amount: true },
  });
  const owed = sums.filter((s) => decimalToNumber(s._sum.amount ?? 0) >= 0.01);
  const tenants = await prisma.tenant.findMany({
    where: { id: { in: owed.map((s) => s.tenantId) } },
    select: {
      id: true,
      name: true,
      slug: true,
      verifiedBadge: true,
      settlementBankCode: true,
      settlementAccountNumber: true,
      settlementAccountName: true,
    },
  });
  const byId = new Map(tenants.map((t) => [t.id, t]));
  return owed
    .map((s) => {
      const t = byId.get(s.tenantId);
      return {
        tenantId: s.tenantId,
        shopName: t?.name ?? "",
        slug: t?.slug ?? "",
        verified: t?.verifiedBadge ?? false,
        bankCode: t?.settlementBankCode ?? null,
        accountNumber: t?.settlementAccountNumber ?? null,
        accountName: t?.settlementAccountName ?? null,
        currency: s.currency,
        amount: decimalToNumber(s._sum.amount ?? 0),
      };
    })
    .sort((a, b) => b.amount - a.amount);
}

adminPayoutsRouter.get("/payouts", async (_req, res, next) => {
  try {
    const [balances, recent] = await Promise.all([
      adminBalances(),
      prisma.sellerLedgerEntry.findMany({
        where: { kind: "payout" },
        orderBy: { createdAt: "desc" },
        take: 50,
        include: { tenant: { select: { name: true, slug: true } } },
      }),
    ]);
    return res.json({
      balances,
      recentPayouts: recent.map((e) => ({ ...toEntry(e), shopName: e.tenant.name, slug: e.tenant.slug })),
    });
  } catch (err) {
    return next(err);
  }
});

function csvCell(value: string | number | null): string {
  const s = value === null ? "" : String(value);
  // Leading =,+,-,@ would run as a formula in spreadsheet apps.
  const safe = /^[=+\-@\t\r]/.test(s) ? `'${s}` : s;
  return `"${safe.replace(/"/g, '""')}"`;
}

adminPayoutsRouter.get("/payouts.csv", async (_req, res, next) => {
  try {
    const rows = await adminBalances();
    const header = ["Shop", "Slug", "Verified", "Bank code", "Account number", "Account name", "Currency", "Amount owed"];
    const lines = [
      header.map(csvCell).join(","),
      ...rows.map((r) =>
        [r.shopName, r.slug, r.verified ? "yes" : "no", r.bankCode, r.accountNumber, r.accountName, r.currency, r.amount.toFixed(2)]
          .map(csvCell)
          .join(",")
      ),
    ];
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="payouts-${new Date().toISOString().slice(0, 10)}.csv"`);
    res.setHeader("Cache-Control", "no-store");
    return res.send(lines.join("\n"));
  } catch (err) {
    return next(err);
  }
});

/** Records a bank transfer made outside the platform. Cannot exceed what is owed. */
adminPayoutsRouter.post("/payouts", async (req, res, next) => {
  try {
    const body = z
      .object({
        tenantId: z.string().min(10).max(40),
        currency: z.string().length(3).default("NGN"),
        amount: z.coerce.number().positive().max(1_000_000_000),
        reference: z.string().trim().min(3).max(120),
        note: z.string().trim().max(500).optional(),
      })
      .parse(req.body);
    const amount = Math.round(body.amount * 100) / 100;

    const entry = await prisma.$transaction(
      async (tx) => {
        const sum = await tx.sellerLedgerEntry.aggregate({
          where: { tenantId: body.tenantId, currency: body.currency },
          _sum: { amount: true },
        });
        const owed = decimalToNumber(sum._sum.amount ?? 0);
        if (amount > owed + 0.001) return null;
        return tx.sellerLedgerEntry.create({
          data: {
            tenantId: body.tenantId,
            kind: "payout",
            amount: -amount,
            currency: body.currency,
            reference: body.reference,
            note: body.note,
            createdById: req.user!.id,
          },
        });
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
    );
    if (!entry) return res.status(400).json({ error: "Amount is more than this shop is owed" });
    return res.status(201).json({ entry: toEntry(entry) });
  } catch (err) {
    if (err instanceof z.ZodError) return res.status(400).json({ error: "Validation failed", details: err.flatten() });
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2034") {
      return res.status(409).json({ error: "Another payout was recorded at the same time. Try again." });
    }
    return next(err);
  }
});
