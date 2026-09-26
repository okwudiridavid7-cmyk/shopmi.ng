export type UserRole = "buyer" | "seller" | "tenant_admin" | "super_admin";

export type TenantStatus = "pending_verification" | "active" | "suspended";

export type TenantAdminRole = "owner" | "manager" | "staff";

export type ProductStatus = "draft" | "active" | "archived";

export type OrderStatus =
  | "pending_payment"
  | "paid"
  | "fulfilled"
  | "cancelled"
  | "failed";

export interface UserPublic {
  id: string;
  email: string;
  role: UserRole;
  name: string | null;
  phone: string | null;
  whatsappNumber: string | null;
  /** True when a password hash exists (email/password account). */
  hasPassword: boolean;
  /** True when linked to Google OAuth. */
  googleLinked: boolean;
  /** ISO timestamp when email was verified; null if pending. */
  emailVerifiedAt: string | null;
  notificationPrefs: {
    orderEmails: boolean;
    whatsappOrders: boolean;
  };
  createdAt: string;
}

export type SocialLinks = {
  instagram?: string;
  twitter?: string;
  facebook?: string;
  tiktok?: string;
  whatsapp?: string;
  youtube?: string;
  [key: string]: string | undefined;
};

export type FaqItem = {
  question: string;
  answer: string;
};

export interface TenantPublic {
  id: string;
  name: string;
  slug: string;
  customDomain: string | null;
  status: TenantStatus;
  verifiedBadge: boolean;
  themeSettings: Record<string, unknown> | null;
  notificationSettings: Record<string, unknown> | null;
  location: string | null;
  countryCode: string | null;
  stateCode: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
  socialLinks: SocialLinks | null;
  faqContent: FaqItem[] | null;
  termsText: string | null;
  privacyText: string | null;
  trialEndsAt: string | null;
  planId: string | null;
  createdAt: string;
}

export interface CountryPublic {
  id: string;
  name: string;
  iso2: string;
}

export interface StatePublic {
  id: string;
  name: string;
  iso2: string | null;
  countryIso2: string;
}

export interface ShopCategoryPublic {
  id: string;
  tenantId: string;
  name: string;
  slug: string;
  createdAt: string;
}

export interface ShopBannerPublic {
  id: string;
  tenantId: string;
  imageUrl: string;
  title: string | null;
  subtitle: string | null;
  ctaText: string | null;
  ctaUrl: string | null;
  scrollSpeed: number;
  displayOrder: number;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PlanPublic {
  id: string;
  name: string;
  slug: string;
  price: number;
  currency: string;
  productLimit: number | null;
  featureFlags: Record<string, unknown>;
  trialDays: number;
  active?: boolean;
}

export interface AdminOverview {
  period?: "today" | "week" | "month";
  tenantCount: number;
  pendingVerifications: number;
  orderCount: number;
  paidOrderCount: number;
  salesTotal: number;
  gmv?: number;
  currency: string;
  userCount: number;
  buyerCount?: number;
  sellerCount?: number;
  productCount: number;
  recentShops?: {
    id: string;
    name: string;
    slug: string;
    status: TenantStatus;
    verifiedBadge: boolean;
    createdAt: string;
    ownerEmail: string;
    planName: string | null;
  }[];
  /** Daily shop signups for the selected period (real data). */
  signupsOverTime?: { date: string; count: number }[];
}

export interface TeamMemberPublic {
  id: string;
  role: TenantAdminRole;
  permissions: unknown;
  user: UserPublic;
}

export interface CategoryPublic {
  id: string;
  name: string;
  slug: string;
  parentId: string | null;
  sortOrder: number;
  /** Nested children when API returns a tree. */
  children?: CategoryPublic[];
}

/** Seller trust metrics for PDP / shop cards. Raw zeros are omitted by the UI. */
export interface SellerTrustPublic {
  shopName: string;
  shopSlug: string;
  verifiedBadge: boolean;
  logoUrl: string | null;
  yearsOnPlatform: number;
  /** Completed (paid|fulfilled) order count — drives Quality/Delivery threshold. */
  ordersCompletedCount: number;
  /** Same as completed orders for “number of sales”; UI hides when 0. */
  salesCount: number;
  reviewCount: number;
  avgRating: number | null;
  /**
   * Quality / Delivery % only populate once `ordersCompletedCount >= 10`
   * (see API comment / sellerTrust helper). Otherwise null — UI must hide.
   */
  qualityPercent: number | null;
  deliveryPercent: number | null;
}

export interface BrandPublic {
  id: string;
  name: string;
  slug: string;
}

export interface ProductImageAsset {
  original: string;
  watermarked: string | null;
}

export interface ProductPublic {
  id: string;
  tenantId: string;
  title: string;
  description: string;
  aiGeneratedDescription: boolean;
  price: number;
  compareAtPrice: number | null;
  currency: string;
  stockQty: number;
  categoryId: string | null;
  shopCategoryId: string | null;
  brandName: string | null;
  brandId: string | null;
  location: string | null;
  countryCode: string | null;
  stateCode: string | null;
  images: string[];
  imageAssets: ProductImageAsset[];
  watermarkEnabled: boolean;
  status: ProductStatus;
  createdAt: string;
  category?: CategoryPublic | null;
  shopCategory?: ShopCategoryPublic | null;
  brand?: BrandPublic | null;
  tenant?: Pick<TenantPublic, "id" | "name" | "slug" | "verifiedBadge"> | null;
  /** Present when API attaches review aggregates; omit/zero means hide stars in UI. */
  reviewCount?: number;
  avgRating?: number | null;
}

export interface CartItemPublic {
  id: string;
  productId: string;
  qty: number;
  product: ProductPublic;
}

export interface CartPublic {
  id: string | null;
  tenantId: string;
  shopSlug?: string;
  shopName?: string;
  items: CartItemPublic[];
  subtotal: number;
  currency: string;
}

export interface CartSummary {
  itemCount: number;
  carts: CartPublic[];
}

export interface OrderItemPublic {
  id: string;
  productId: string;
  qty: number;
  unitPrice: number;
  product?: Pick<ProductPublic, "id" | "title" | "images"> | null;
}

export interface OrderPublic {
  id: string;
  tenantId: string;
  buyerId: string;
  status: OrderStatus;
  subtotal: number;
  total: number;
  currency: string;
  paystackReference: string | null;
  invoiceUrl: string | null;
  createdAt: string;
  items: OrderItemPublic[];
  tenant?: Pick<TenantPublic, "id" | "name" | "slug" | "verifiedBadge"> | null;
  buyer?: Pick<UserPublic, "id" | "email" | "name"> | null;
}

/** Persisted in tenants.theme_settings JSON. */
export interface ShopThemeSettings {
  logoUrl?: string | null;
  /** Horizontal lockup (icon + shop name) from the logo builder. */
  logoRectUrl?: string | null;
  logoBuilder?: {
    iconId?: string;
    color?: string;
    fontPairId?: string;
  } | null;
  /** Primary brand color — CTAs, shop header bar (never full page bg). */
  primaryColor?: string | null;
  /** Optional secondary accent for badges/links/dividers. */
  accentColor?: string | null;
  shopDescription?: string | null;
  contactEmail?: string | null;
  contactPhone?: string | null;
  /** When false, public contact form is disabled (default true). */
  contactFormEnabled?: boolean;
  /** Storefront: show Promo Products section (default false). */
  promoProductsEnabled?: boolean;
  /** Storefront: show New Arrivals section (default false). */
  newArrivalsEnabled?: boolean;
  /** Days window for new arrivals (default 30). */
  newArrivalsDays?: number;
  tickerEnabled?: boolean;
  tickerText?: string | null;
  tickerSpeed?: number;
  tickerBg?: string | null;
  tickerColor?: string | null;
  whatsappUrl?: string | null;
  chatbotHtml?: string | null;
}

export type AnnouncementTicker = {
  enabled: boolean;
  text: string;
  speed: number;
  backgroundColor: string;
  textColor: string;
};

export type PlatformBranding = {
  appName: string;
  webUrl: string;
  logoUrl: string | null;
  logoSquareUrl: string | null;
  supportEmail: string;
  ticker: AnnouncementTicker | null;
  whatsappUrl: string | null;
  chatbotHtml: string | null;
  /** Cloudflare Turnstile site key for public contact forms (null if disabled). */
  turnstileSiteKey?: string | null;
  /** When true, shop contact requires submitter email confirmation (REM-17). */
  shopContactConfirmRequired?: boolean;
  /** When false, hide public pricing / plan CTAs. */
  billingEnabled?: boolean;
  /** Platform take on marketplace orders (Shopmi Service Fee %), informational. */
  commissionPercent?: number;
};

/** Platform homepage banner slide stored in platform_settings.homepage_banners JSON. */
export interface PlatformBannerSlide {
  id: string;
  imageUrl: string;
  title?: string | null;
  subtitle?: string | null;
  ctaText?: string | null;
  ctaUrl?: string | null;
  scrollSpeed?: number;
  active?: boolean;
  displayOrder?: number;
}

export interface CatalogFilters {
  category?: string;
  brand?: string;
  location?: string;
  minPrice?: number;
  maxPrice?: number;
  q?: string;
}

export interface PlatformSetting {
  id: string;
  key: string;
  value: string;
}

export interface AuthTokensResponse {
  user: UserPublic;
}

export interface ApiError {
  error: string;
  details?: unknown;
}

export interface HealthResponse {
  status: "ok";
  timestamp: string;
}

export interface HelloResponse {
  message: string;
  user: UserPublic;
  tenant: TenantPublic | null;
}

export interface SellerStats {
  productCount: number;
  orderCount: number;
  salesTotal: number;
  currency: string;
}

export interface SellerAnalytics {
  period: "today" | "week" | "month";
  periodDays: number;
  currency: string;
  totals: {
    revenue: number;
    orderCount: number;
    productCount: number;
    conversionRate: number;
    pendingOrderCount?: number;
    allOrderCount?: number;
  };
  salesOverTime: { date: string; revenue: number; orders: number }[];
  topProducts: {
    productId: string;
    title: string;
    qty: number;
    revenue: number;
  }[];
}

export type AiJobStatus = "queued" | "processing" | "completed" | "failed";

export interface AiJobPublic {
  id: string;
  status: AiJobStatus;
  description: string | null;
  error: string | null;
  completedAt: string | null;
}

export type VerificationRequestStatus = "pending" | "approved" | "rejected";

export interface VerificationRequestPublic {
  id: string;
  tenantId: string;
  status: VerificationRequestStatus;
  submittedDocs: { name: string; url: string }[];
  reviewedById: string | null;
  reviewedAt: string | null;
  note: string | null;
  createdAt: string;
  tenant?: Pick<TenantPublic, "id" | "name" | "slug" | "verifiedBadge"> | null;
}

export type CampaignType = "popup";

export interface CampaignContent {
  headline: string;
  body: string;
  ctaLabel?: string;
  ctaUrl?: string;
}

export interface CampaignTriggerRule {
  type: "on_visit" | "on_exit_intent";
}

export interface CampaignPublic {
  id: string;
  tenantId: string;
  type: CampaignType;
  content: CampaignContent;
  active: boolean;
  triggerRule: CampaignTriggerRule;
  createdAt: string;
}

export interface ReviewPublic {
  id: string;
  productId: string;
  buyerId: string;
  rating: number;
  comment: string;
  createdAt: string;
  buyerEmailMasked?: string;
}

export interface ReviewSummary {
  average: number;
  count: number;
  /** Counts for ratings 5★ … 1★ (index 0 = five stars). */
  distribution: [number, number, number, number, number];
  reviews: ReviewPublic[];
  canReview: boolean;
}
