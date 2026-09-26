import { prisma } from "../db/prisma";
import { env } from "../config/env";
import { getCommissionPercent } from "../lib/platformSettings";

type PaystackSubaccountResponse = {
  status: boolean;
  message: string;
  data?: {
    subaccount_code: string;
    business_name?: string;
  };
};

/**
 * Create or reuse a Paystack subaccount for a verified seller.
 *
 * Requires settlement bank code + account number on the tenant (or passed in).
 * percentage_charge is set from platform `commission_percent` so Paystack can
 * split by percentage when transaction_charge is not supplied at initialize.
 *
 * @see apps/api/docs/PAYSTACK_SPLITS.md
 */
export async function ensurePaystackSubaccount(
  tenantId: string,
  opts?: {
    bankCode?: string;
    accountNumber?: string;
    businessName?: string;
  }
): Promise<string | null> {
  if (!env.paystackSecretKey) {
    console.warn("[paystack] no secret key — skip subaccount create");
    return null;
  }

  const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
  if (!tenant) return null;

  if (tenant.paystackSubaccountCode) {
    return tenant.paystackSubaccountCode;
  }

  const bankCode = (opts?.bankCode ?? tenant.settlementBankCode)?.trim();
  const accountNumber = (
    opts?.accountNumber ?? tenant.settlementAccountNumber
  )?.trim();
  const businessName = (opts?.businessName ?? tenant.name).trim();

  if (!bankCode || !accountNumber) {
    console.info(
      `[paystack] tenant ${tenant.slug} verified but missing settlement bank — subaccount deferred`
    );
    return null;
  }

  // Persist bank details if newly provided
  if (
    opts?.bankCode ||
    opts?.accountNumber ||
    !tenant.settlementBankCode ||
    !tenant.settlementAccountNumber
  ) {
    await prisma.tenant.update({
      where: { id: tenantId },
      data: {
        settlementBankCode: bankCode,
        settlementAccountNumber: accountNumber,
      },
    });
  }

  const percentageCharge = await getCommissionPercent(5);

  const res = await fetch("https://api.paystack.co/subaccount", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.paystackSecretKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      business_name: businessName,
      settlement_bank: bankCode,
      account_number: accountNumber,
      percentage_charge: percentageCharge,
      description: `Shopmi seller — ${tenant.slug}`,
    }),
  });

  const json = (await res.json()) as PaystackSubaccountResponse;
  if (!res.ok || !json.status || !json.data?.subaccount_code) {
    console.warn(
      `[paystack] subaccount create failed for ${tenant.slug}:`,
      json.message || res.status
    );
    return null;
  }

  const code = json.data.subaccount_code;
  await prisma.tenant.update({
    where: { id: tenantId },
    data: { paystackSubaccountCode: code },
  });

  return code;
}
