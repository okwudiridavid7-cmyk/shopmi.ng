# Paystack settlement — Shopmi Service Fee

How marketplace checkout money is split between Shopmi and the seller.

## Flow

1. **Buyer** pays the full order amount via Paystack (amount in kobo for NGN).
2. For **verified sellers** with a Paystack subaccount (`Tenant.paystackSubaccountCode`):
   - Checkout initializes with `subaccount` + `transaction_charge` (kobo).
   - `transaction_charge` is the **Shopmi Service Fee** — `commission_percent` of the order (from platform settings).
   - Paystack settles that flat fee to the **main Shopmi Paystack balance**.
   - The **seller subaccount** receives the remainder, settled to their linked bank.
3. `bearer: "account"` — Paystack’s own processing fee is borne by the main account (platform), not the subaccount.
4. If the seller is unverified or has no subaccount yet, the full charge settles to the main account (no split). Subaccounts are created when a seller becomes verified **and** has settlement bank details (`settlementBankCode` + `settlementAccountNumber`).

## Multi-vendor carts

Buyers can hold items from several shops. Checkout creates **one Paystack payment (and one Order) per shop**, chained automatically in the web app after each successful callback. That keeps subaccount settlement correct per vendor — Paystack does not support multiple subaccounts on a single `transaction/initialize` with our current fee model.

## Alternative: percentage split

When creating the subaccount we also set `percentage_charge` to `commission_percent`. If you omit `transaction_charge` at initialize, Paystack can split by that percentage instead. Prefer `transaction_charge` at checkout so the fee amount is explicit and labeled as **Shopmi Service Fee** in metadata.

## Related code

- `apps/api/src/services/paystackSubaccount.ts` — create/reuse subaccount on verify
- `apps/api/src/routes/checkout.ts` — initialize with subaccount + service fee
- Platform setting: `commission_percent` (default `5`)
