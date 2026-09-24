import { prisma } from "../db/prisma";

/**
 * Merge guest session carts into the authenticated user's carts (per tenant).
 * Stub-friendly pending full Phase 1 checkout wiring for guests.
 */
export async function mergeGuestCarts(
  userId: string,
  sessionId: string | undefined
): Promise<number> {
  if (!sessionId) return 0;

  const guestCarts = await prisma.cart.findMany({
    where: { sessionId, userId: null },
    include: { items: true },
  });

  let merged = 0;
  for (const guest of guestCarts) {
    const userCart = await prisma.cart.upsert({
      where: {
        tenantId_userId: { tenantId: guest.tenantId, userId },
      },
      create: { tenantId: guest.tenantId, userId, sessionId: null },
      update: {},
    });

    for (const item of guest.items) {
      await prisma.cartItem.upsert({
        where: {
          cartId_productId: {
            cartId: userCart.id,
            productId: item.productId,
          },
        },
        create: {
          cartId: userCart.id,
          productId: item.productId,
          qty: item.qty,
        },
        update: { qty: { increment: item.qty } },
      });
      merged += 1;
    }

    await prisma.cartItem.deleteMany({ where: { cartId: guest.id } });
    await prisma.cart.delete({ where: { id: guest.id } });
  }

  return merged;
}
