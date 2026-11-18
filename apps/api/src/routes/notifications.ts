import { Router } from "express";
import { prisma } from "../db/prisma";
import { requireAuth } from "../auth/middleware";

export const notificationsRouter = Router();
notificationsRouter.use(requireAuth);

const seedRows = [
  { id: "seed-welcome-shopmi", title: "Welcome to Shopmi.ng", body: "Your dashboard is ready. Explore your account and discover what you can do next.", href: "/explore", kind: "platform" },
  { id: "seed-account-security", title: "Keep your account secure", body: "Add a recovery phone number and use a strong password to protect your account.", href: "/buyer/account", kind: "platform" },
  { id: "seed-marketplace-growth", title: "Your marketplace is growing", body: "New products and shops are being added regularly. Visit the marketplace to see what is new.", href: "/explore", kind: "platform" },
];

async function ensureSeedNotifications() {
  await prisma.platformNotification.createMany({ data: seedRows.map((row) => ({ ...row, audience: "all", seeded: true })), skipDuplicates: true });
}

notificationsRouter.get("/", async (req, res, next) => {
  try {
    await ensureSeedNotifications();
    const role = req.user!.role;
    const [rows, unreadOrders, sellerSetup] = await Promise.all([
      prisma.platformNotification.findMany({
        where: { OR: [{ audience: "all" }, { audience: role }, { audience: { contains: `|${role}|` } }] },
        include: { reads: { where: { userId: req.user!.id }, select: { readAt: true } } },
        orderBy: { createdAt: "desc" }, take: 40,
      }),
      role === "seller" || role === "tenant_admin"
        ? prisma.order.findMany({ where: { tenant: { OR: [{ ownerUserId: req.user!.id }, { tenantAdmins: { some: { userId: req.user!.id } } }] }, status: "paid" }, select: { id: true, createdAt: true, tenant: { select: { name: true } } }, orderBy: { createdAt: "desc" }, take: 10 })
        : role === "buyer"
          ? prisma.order.findMany({ where: { buyerId: req.user!.id, status: "pending_payment" }, select: { id: true, createdAt: true, tenant: { select: { name: true } } }, orderBy: { createdAt: "desc" }, take: 10 })
          : Promise.resolve([]),
      role === "seller" || role === "tenant_admin"
        ? prisma.tenant.findFirst({ where: { OR: [{ ownerUserId: req.user!.id }, { tenantAdmins: { some: { userId: req.user!.id } } }] }, select: { id: true, name: true, slug: true, location: true, countryCode: true, stateCode: true, email: true, phone: true, themeSettings: true, onboardingAnswers: true, _count: { select: { products: true } } } })
        : Promise.resolve(null),
    ]);
    const prefs = (req.user!.notificationPrefs as Record<string, unknown> | null) ?? {};
    const readGeneratedIds = Array.isArray(prefs.readGeneratedNotificationIds) ? prefs.readGeneratedNotificationIds.filter((id): id is string => typeof id === "string") : [];
    const notices = rows.map((row) => ({ id: row.id, title: row.title, body: row.body, href: row.href, kind: row.kind, createdAt: row.createdAt.toISOString(), read: row.reads.length > 0 }));
    const orderNotices = unreadOrders.map((order) => ({ id: `order:${order.id}`, title: "Order needs attention", body: `Order for ${order.tenant.name} is awaiting payment or processing.`, href: role === "buyer" ? "/buyer/orders" : "/seller/orders", kind: "order", createdAt: order.createdAt.toISOString(), read: readGeneratedIds.includes(`order:${order.id}`) }));
    const setupAnswers = (sellerSetup?.onboardingAnswers as Record<string, unknown> | null) ?? {};
    const setupTheme = (sellerSetup?.themeSettings as Record<string, unknown> | null) ?? {};
    const profileDone = !!(sellerSetup?.location && sellerSetup.countryCode && sellerSetup.stateCode && sellerSetup.email && sellerSetup.phone && typeof setupTheme.shopDescription === "string" && setupTheme.shopDescription.trim().length >= 20);
    const businessDone = !!(setupAnswers.sellingExperience && setupAnswers.fulfillmentMethod && setupAnswers.weeklyOrders && setupAnswers.staffCount && setupAnswers.physicalStores && Array.isArray(setupAnswers.currencies) && setupAnswers.currencies.length);
    const brandingDone = !!(setupTheme.logoUrl || setupTheme.logoRectUrl);
    const setupNotice = sellerSetup && !(profileDone && businessDone && brandingDone) ? [{ id: `setup:${sellerSetup.id}`, title: "Finish setting up your shop", body: "Complete your shop details, business profile, and branding before you list your first product.", href: "/seller", kind: "task", createdAt: new Date().toISOString(), read: readGeneratedIds.includes(`setup:${sellerSetup.id}`) }] : [];
    const notifications = [...setupNotice, ...orderNotices, ...notices].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    return res.json({ notifications, unreadCount: notifications.filter((n) => !n.read).length });
  } catch (error) { return next(error); }
});

notificationsRouter.post("/:id/read", async (req, res, next) => {
  try {
    if (req.params.id.startsWith("order:") || req.params.id.startsWith("setup:")) {
      const current = await prisma.user.findUnique({ where: { id: req.user!.id }, select: { notificationPrefs: true } });
      const prefs = (current?.notificationPrefs as Record<string, unknown> | null) ?? {};
      const ids = Array.isArray(prefs.readGeneratedNotificationIds) ? prefs.readGeneratedNotificationIds.filter((id): id is string => typeof id === "string") : [];
      await prisma.user.update({ where: { id: req.user!.id }, data: { notificationPrefs: { ...prefs, readGeneratedNotificationIds: [...new Set([...ids, req.params.id])].slice(-500) } } });
      return res.json({ ok: true });
    }
    await prisma.userNotificationRead.upsert({ where: { userId_notificationId: { userId: req.user!.id, notificationId: req.params.id } }, create: { userId: req.user!.id, notificationId: req.params.id }, update: { readAt: new Date() } });
    return res.json({ ok: true });
  } catch (error) { return next(error); }
});

notificationsRouter.post("/read-all", async (req, res, next) => {
  try {
    const rows = await prisma.platformNotification.findMany({ select: { id: true }, where: { OR: [{ audience: "all" }, { audience: req.user!.role }, { audience: { contains: `|${req.user!.role}|` } }] } });
    if (rows.length) await prisma.userNotificationRead.createMany({ data: rows.map((row) => ({ userId: req.user!.id, notificationId: row.id })), skipDuplicates: true });
    const role = req.user!.role;
    const [orders, tenant] = await Promise.all([
      role === "seller" || role === "tenant_admin"
        ? prisma.order.findMany({ where: { tenant: { OR: [{ ownerUserId: req.user!.id }, { tenantAdmins: { some: { userId: req.user!.id } } }] }, status: "paid" }, select: { id: true }, take: 10 })
        : role === "buyer" ? prisma.order.findMany({ where: { buyerId: req.user!.id, status: "pending_payment" }, select: { id: true }, take: 10 }) : Promise.resolve([]),
      role === "seller" || role === "tenant_admin" ? prisma.tenant.findFirst({ where: { OR: [{ ownerUserId: req.user!.id }, { tenantAdmins: { some: { userId: req.user!.id } } }] }, select: { id: true } }) : Promise.resolve(null),
    ]);
    const current = await prisma.user.findUnique({ where: { id: req.user!.id }, select: { notificationPrefs: true } });
    const prefs = (current?.notificationPrefs as Record<string, unknown> | null) ?? {};
    const oldIds = Array.isArray(prefs.readGeneratedNotificationIds) ? prefs.readGeneratedNotificationIds.filter((id): id is string => typeof id === "string") : [];
    const generatedIds = [...orders.map((order) => `order:${order.id}`), ...(tenant ? [`setup:${tenant.id}`] : [])];
    await prisma.user.update({ where: { id: req.user!.id }, data: { notificationPrefs: { ...prefs, readGeneratedNotificationIds: [...new Set([...oldIds, ...generatedIds])].slice(-500) } } });
    return res.json({ ok: true });
  } catch (error) { return next(error); }
});
