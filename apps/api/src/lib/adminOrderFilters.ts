import type { Prisma } from "@prisma/client";

export type AdminOrdersQuery = {
  flag?: string;
  refundStatus?: string;
  status?: string;
  q?: string;
  needsAttention?: boolean;
};

/** Build Prisma where for GET /api/admin/orders. */
export function adminOrdersWhere(query: AdminOrdersQuery): Prisma.OrderWhereInput {
  const flag = (query.flag ?? "").trim();
  const refundStatus = (query.refundStatus ?? "").trim();
  const status = (query.status ?? "").trim();
  const q = (query.q ?? "").trim();

  const where: Prisma.OrderWhereInput = {};
  if (query.needsAttention) {
    where.OR = [
      { flag: { not: null } },
      { refundStatus: "failed" },
      { refundStatus: "pending" },
    ];
  } else {
    if (flag) where.flag = flag;
    if (refundStatus) where.refundStatus = refundStatus;
    if (
      status === "pending_payment" ||
      status === "paid" ||
      status === "fulfilled" ||
      status === "cancelled" ||
      status === "failed"
    ) {
      where.status = status;
    }
  }
  if (q) {
    where.AND = [
      {
        OR: [
          { id: { contains: q } },
          { paystackReference: { contains: q } },
          { buyer: { email: { contains: q, mode: "insensitive" } } },
          { tenant: { slug: { contains: q, mode: "insensitive" } } },
          { tenant: { name: { contains: q, mode: "insensitive" } } },
        ],
      },
    ];
  }
  return where;
}
