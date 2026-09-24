import type {
  Brand,
  Category,
  Order,
  OrderItem,
  Product,
  Tenant,
  User,
} from "@prisma/client";
import type {
  BrandPublic,
  CategoryPublic,
  OrderItemPublic,
  OrderPublic,
  ProductPublic,
  TenantPublic,
  UserPublic,
} from "@vendors/shared-types";
import {
  parseFaqContent,
  parseSocialLinks,
  toShopCategoryPublic,
} from "./shopSerialize";
import type { ShopCategory } from "@prisma/client";
import {
  parseProductImageAssets,
  resolveProductDisplayImages,
} from "./productImages";

export function decimalToNumber(value: { toString(): string } | number | string): number {
  return typeof value === "number" ? value : Number(value);
}

export function toUserPublic(user: User): UserPublic {
  const prefs =
    (user.notificationPrefs as {
      orderEmails?: boolean;
      whatsappOrders?: boolean;
    } | null) ?? {};
  return {
    id: user.id,
    email: user.email,
    role: user.role,
    name: user.name ?? null,
    phone: user.phone,
    whatsappNumber: user.whatsappNumber,
    hasPassword: !!user.passwordHash,
    googleLinked: !!user.googleId,
    notificationPrefs: {
      orderEmails: prefs.orderEmails !== false,
      whatsappOrders: !!prefs.whatsappOrders,
    },
    createdAt: user.createdAt.toISOString(),
  };
}

export function toTenantPublic(tenant: Tenant): TenantPublic {
  return {
    id: tenant.id,
    name: tenant.name,
    slug: tenant.slug,
    customDomain: tenant.customDomain,
    status: tenant.status,
    verifiedBadge: tenant.verifiedBadge,
    themeSettings: (tenant.themeSettings as Record<string, unknown> | null) ?? null,
    notificationSettings:
      (tenant.notificationSettings as Record<string, unknown> | null) ?? null,
    location: tenant.location,
    countryCode: tenant.countryCode,
    stateCode: tenant.stateCode,
    address: tenant.address,
    phone: tenant.phone,
    email: tenant.email,
    socialLinks: parseSocialLinks(tenant.socialLinks),
    faqContent: parseFaqContent(tenant.faqContent),
    termsText: tenant.termsText,
    privacyText: tenant.privacyText,
    trialEndsAt: tenant.trialEndsAt?.toISOString() ?? null,
    planId: tenant.planId,
    createdAt: tenant.createdAt.toISOString(),
  };
}

export function toCategoryPublic(category: Category): CategoryPublic {
  return {
    id: category.id,
    name: category.name,
    slug: category.slug,
    parentId: category.parentId ?? null,
    sortOrder: category.sortOrder ?? 0,
  };
}

export function toBrandPublic(brand: Brand): BrandPublic {
  return { id: brand.id, name: brand.name, slug: brand.slug };
}

type ProductWithRelations = Product & {
  category?: Category | null;
  shopCategory?: ShopCategory | null;
  brand?: Brand | null;
  tenant?: (Pick<Tenant, "id" | "name" | "slug"> & {
    verifiedBadge?: boolean;
  }) | null;
  _reviewCount?: number;
  _avgRating?: number | null;
};

export function toProductPublic(product: ProductWithRelations): ProductPublic {
  const imageAssets = parseProductImageAssets(product.images);
  const images = resolveProductDisplayImages(
    product.images,
    product.watermarkEnabled
  );
  const brandName =
    product.brandName?.trim() ||
    product.brand?.name ||
    null;
  const reviewCount = product._reviewCount ?? 0;
  const avgRating =
    reviewCount > 0 && product._avgRating != null ? product._avgRating : null;
  return {
    id: product.id,
    tenantId: product.tenantId,
    title: product.title,
    description: product.description,
    aiGeneratedDescription: product.aiGeneratedDescription,
    price: decimalToNumber(product.price),
    compareAtPrice: product.compareAtPrice
      ? decimalToNumber(product.compareAtPrice)
      : null,
    currency: product.currency,
    stockQty: product.stockQty,
    categoryId: product.categoryId,
    shopCategoryId: product.shopCategoryId,
    brandName,
    brandId: product.brandId,
    location: product.location,
    countryCode: product.countryCode,
    stateCode: product.stateCode,
    images,
    imageAssets,
    watermarkEnabled: product.watermarkEnabled,
    status: product.status,
    createdAt: product.createdAt.toISOString(),
    category: product.category ? toCategoryPublic(product.category) : null,
    shopCategory: product.shopCategory
      ? toShopCategoryPublic(product.shopCategory)
      : null,
    brand: product.brand ? toBrandPublic(product.brand) : null,
    tenant: product.tenant
      ? {
          id: product.tenant.id,
          name: product.tenant.name,
          slug: product.tenant.slug,
          verifiedBadge: product.tenant.verifiedBadge ?? false,
        }
      : null,
    ...(reviewCount > 0
      ? { reviewCount, avgRating }
      : {}),
  };
}

type OrderWithRelations = Order & {
  items: (OrderItem & {
    product?: Pick<Product, "id" | "title" | "images"> | null;
  })[];
  tenant?: (Pick<Tenant, "id" | "name" | "slug"> & {
    verifiedBadge?: boolean;
  }) | null;
  buyer?: Pick<User, "id" | "email" | "name"> | null;
};

export function toOrderPublic(order: OrderWithRelations): OrderPublic {
  return {
    id: order.id,
    tenantId: order.tenantId,
    buyerId: order.buyerId,
    status: order.status,
    subtotal: decimalToNumber(order.subtotal),
    total: decimalToNumber(order.total),
    currency: order.currency,
    paystackReference: order.paystackReference,
    invoiceUrl: order.invoiceUrl,
    createdAt: order.createdAt.toISOString(),
    items: order.items.map(
      (item): OrderItemPublic => ({
        id: item.id,
        productId: item.productId,
        qty: item.qty,
        unitPrice: decimalToNumber(item.unitPrice),
        product: item.product
          ? {
              id: item.product.id,
              title: item.product.title,
              images: resolveProductDisplayImages(item.product.images, true),
            }
          : null,
      })
    ),
    tenant: order.tenant
      ? {
          id: order.tenant.id,
          name: order.tenant.name,
          slug: order.tenant.slug,
          verifiedBadge: order.tenant.verifiedBadge ?? false,
        }
      : null,
    buyer: order.buyer
      ? {
          id: order.buyer.id,
          email: order.buyer.email,
          name: order.buyer.name ?? null,
        }
      : null,
  };
}
