import {
  pgTable,
  text,
  integer,
  boolean,
  serial,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";

/**
 * PostgreSQL schema — app imports tables from "@/lib/db/schema".
 */

// ─── Multi-Tenant ────────────────────────────────────────────────────────────

export const sites = pgTable("sites", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  domain: text("domain"),
  domainStatus: text("domain_status").notNull().default("not_configured"),
  domainVerifiedAt: text("domain_verified_at"),
  domainLastCheckedAt: text("domain_last_checked_at"),
  domainError: text("domain_error"),
  description: text("description"),
  logo: text("logo"),
  template: text("template").notNull().default("blank"),
  published: boolean("published").notNull().default(false),
  createdAt: text("created_at")
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
  updatedAt: text("updated_at")
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
});

// ─── Pages (generic) ─────────────────────────────────────────────────────────

export const pages = pgTable("pages", {
  id: serial("id").primaryKey(),
  siteId: integer("site_id").notNull().references(() => sites.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  slug: text("slug").notNull(),
  description: text("description"),
  metaTitle: text("meta_title"),
  metaDescription: text("meta_description"),
  ogImage: text("og_image"),
  canonicalUrl: text("canonical_url"),
  noindex: boolean("noindex").notNull().default(false),
  template: text("template").notNull().default("default"),
  published: boolean("published").notNull().default(false),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: text("created_at")
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
  updatedAt: text("updated_at")
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
}, (t) => ({
  siteIdIdx: index("pages_site_id_idx").on(t.siteId),
  slugIdx: index("pages_slug_idx").on(t.slug),
  siteSlugUnique: uniqueIndex("pages_site_slug_idx").on(t.siteId, t.slug),
}));

// ─── Page Blocks (replaces homeSections) ─────────────────────────────────────

export const pageBlocks = pgTable("page_blocks", {
  id: serial("id").primaryKey(),
  pageId: integer("page_id").notNull().references(() => pages.id, { onDelete: "cascade" }),
  type: text("type").notNull(),
  title: text("title"),
  sortOrder: integer("sort_order").notNull().default(0),
  visible: boolean("visible").notNull().default(true),
  config: text("config"),
  createdAt: text("created_at")
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
  updatedAt: text("updated_at")
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
}, (t) => ({
  pageIdIdx: index("page_blocks_page_id_idx").on(t.pageId),
}));

// ─── Existing Tables (with siteId FK added) ──────────────────────────────────

export const settings = pgTable("settings", {
  id: serial("id").primaryKey(),
  key: text("key").notNull(),
  siteId: integer("site_id").references(() => sites.id, { onDelete: "cascade" }),
  value: text("value").notNull(),
  updatedAt: text("updated_at")
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
}, (t) => ({
  keySiteUnique: uniqueIndex("settings_key_site_id_idx").on(t.key, t.siteId),
  siteIdIdx: index("settings_site_id_idx").on(t.siteId),
}));

export const galleryImages = pgTable("gallery_images", {
  id: serial("id").primaryKey(),
  siteId: integer("site_id").references(() => sites.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  alt: text("alt").notNull(),
  src: text("src").notNull(),
  category: text("category").notNull().default("All"),
  featured: boolean("featured").notNull().default(false),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: text("created_at")
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
}, (t) => ({
  siteIdIdx: index("gallery_images_site_id_idx").on(t.siteId),
}));

export const menuCategories = pgTable("menu_categories", {
  id: serial("id").primaryKey(),
  siteId: integer("site_id").references(() => sites.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  slug: text("slug").notNull(),
  description: text("description"),
  sortOrder: integer("sort_order").notNull().default(0),
}, (t) => ({
  siteIdIdx: index("menu_categories_site_id_idx").on(t.siteId),
  siteSlugUnique: uniqueIndex("menu_categories_site_slug_idx").on(t.siteId, t.slug),
}));

export const menuItems = pgTable("menu_items", {
  id: serial("id").primaryKey(),
  siteId: integer("site_id").references(() => sites.id, { onDelete: "cascade" }),
  categoryId: integer("category_id").references(() => menuCategories.id, {
    onDelete: "cascade",
  }),
  name: text("name").notNull(),
  description: text("description"),
  price: integer("price").notNull(), // NPR
  image: text("image"),
  available: boolean("available").notNull().default(true),
  featured: boolean("featured").notNull().default(false),
  sortOrder: integer("sort_order").notNull().default(0),
}, (t) => ({
  siteIdIdx: index("menu_items_site_id_idx").on(t.siteId),
  categoryIdIdx: index("menu_items_category_id_idx").on(t.categoryId),
}));

export const bookings = pgTable("bookings", {
  id: serial("id").primaryKey(),
  siteId: integer("site_id").references(() => sites.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  email: text("email").notNull(),
  phone: text("phone").notNull(),
  date: text("date").notNull(), // YYYY-MM-DD
  time: text("time").notNull(), // HH:mm
  guests: integer("guests").notNull(),
  occasion: text("occasion"),
  notes: text("notes"),
  status: text("status").notNull().default("pending"), // pending | confirmed | cancelled | completed
  createdAt: text("created_at")
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
}, (t) => ({
  siteIdIdx: index("bookings_site_id_idx").on(t.siteId),
  statusIdx: index("bookings_status_idx").on(t.status),
  createdAtIdx: index("bookings_created_at_idx").on(t.createdAt),
}));

export const messages = pgTable("messages", {
  id: serial("id").primaryKey(),
  siteId: integer("site_id").references(() => sites.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  email: text("email").notNull(),
  phone: text("phone"),
  subject: text("subject").notNull(),
  message: text("message").notNull(),
  read: boolean("read").notNull().default(false),
  createdAt: text("created_at")
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
}, (t) => ({
  siteIdIdx: index("messages_site_id_idx").on(t.siteId),
  readIdx: index("messages_read_idx").on(t.read),
}));

export const media = pgTable("media", {
  id: serial("id").primaryKey(),
  siteId: integer("site_id").references(() => sites.id, { onDelete: "cascade" }),
  filename: text("filename").notNull(),
  originalName: text("original_name").notNull(),
  url: text("url").notNull(),
  publicId: text("public_id"),
  mimeType: text("mime_type").notNull(),
  size: integer("size").notNull(),
  width: integer("width"),
  height: integer("height"),
  folder: text("folder").notNull().default("uploads"),
  alt: text("alt"),
  createdAt: text("created_at")
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
}, (t) => ({
  siteIdIdx: index("media_site_id_idx").on(t.siteId),
  folderIdx: index("media_folder_idx").on(t.folder),
}));

export const navLinks = pgTable("nav_links", {
  id: serial("id").primaryKey(),
  siteId: integer("site_id").references(() => sites.id, { onDelete: "cascade" }),
  label: text("label").notNull(),
  href: text("href").notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
  visible: boolean("visible").notNull().default(true),
  external: boolean("external").notNull().default(false),
  createdAt: text("created_at")
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
}, (t) => ({
  siteIdIdx: index("nav_links_site_id_idx").on(t.siteId),
}));

export const homeSections = pgTable("home_sections", {
  id: serial("id").primaryKey(),
  siteId: integer("site_id").references(() => sites.id, { onDelete: "cascade" }),
  type: text("type").notNull(),
  title: text("title"),
  sortOrder: integer("sort_order").notNull().default(0),
  visible: boolean("visible").notNull().default(true),
  config: text("config"),
  createdAt: text("created_at")
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
}, (t) => ({
  siteIdIdx: index("home_sections_site_id_idx").on(t.siteId),
}));

export const adminUsers = pgTable("admin_users", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  role: text("role").notNull().default("admin"), // super_admin | admin | editor | viewer
  siteId: integer("site_id").references(() => sites.id, { onDelete: "set null" }),
  createdAt: text("created_at")
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
});

export const passwordResetTokens = pgTable("password_reset_tokens", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => adminUsers.id, { onDelete: "cascade" }),
  tokenHash: text("token_hash").notNull().unique(),
  expiresAt: text("expires_at").notNull(),
  usedAt: text("used_at"),
  createdAt: text("created_at")
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
}, (t) => ({
  userIdIdx: index("password_reset_tokens_user_id_idx").on(t.userId),
  tokenHashIdx: index("password_reset_tokens_hash_idx").on(t.tokenHash),
}));

// ─── Per-user tenant feature grants ─────────────────────────────────────────
// Restrictive overlay on top of site-level feature access. When a user has
// grants recorded, they can only use the granted features; with no grants they
// inherit every feature enabled for their site.
export const userFeatures = pgTable("user_features", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => adminUsers.id, { onDelete: "cascade" }),
  feature: text("feature").notNull(),
  createdAt: text("created_at")
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
}, (t) => ({
  userFeatureUnique: uniqueIndex("user_features_user_feature_idx").on(t.userId, t.feature),
  userIdIdx: index("user_features_user_id_idx").on(t.userId),
}));

export const pageRevisions = pgTable("page_revisions", {
  id: serial("id").primaryKey(),
  pageId: integer("page_id").notNull().references(() => pages.id, { onDelete: "cascade" }),
  userId: integer("user_id").references(() => adminUsers.id, { onDelete: "set null" }),
  label: text("label").notNull(),
  snapshot: text("snapshot").notNull(),
  createdAt: text("created_at")
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
}, (t) => ({
  pageIdIdx: index("page_revisions_page_id_idx").on(t.pageId),
  createdAtIdx: index("page_revisions_created_at_idx").on(t.createdAt),
}));

// ─── Ecommerce (tenant-scoped) ──────────────────────────────────────────────

export const customers = pgTable("customers", {
  id: serial("id").primaryKey(),
  siteId: integer("site_id").notNull().references(() => sites.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  email: text("email").notNull(),
  passwordHash: text("password_hash").notNull(),
  phone: text("phone"),
  createdAt: text("created_at").notNull().$defaultFn(() => new Date().toISOString()),
  updatedAt: text("updated_at").notNull().$defaultFn(() => new Date().toISOString()),
}, (t) => ({
  siteIdIdx: index("customers_site_id_idx").on(t.siteId),
  emailIdx: index("customers_email_idx").on(t.email),
  siteEmailUnique: uniqueIndex("customers_site_email_idx").on(t.siteId, t.email),
}));

export const customerAddresses = pgTable("customer_addresses", {
  id: serial("id").primaryKey(),
  customerId: integer("customer_id").notNull().references(() => customers.id, { onDelete: "cascade" }),
  label: text("label").notNull().default("Home"),
  line1: text("line_1").notNull(),
  line2: text("line_2"),
  city: text("city").notNull(),
  state: text("state"),
  postalCode: text("postal_code"),
  country: text("country").notNull().default("US"),
  isDefault: boolean("is_default").notNull().default(false),
  createdAt: text("created_at").notNull().$defaultFn(() => new Date().toISOString()),
}, (t) => ({
  customerIdIdx: index("customer_addresses_customer_id_idx").on(t.customerId),
}));

export const wishlists = pgTable("wishlists", {
  id: serial("id").primaryKey(),
  customerId: integer("customer_id").notNull().references(() => customers.id, { onDelete: "cascade" }),
  productId: integer("product_id").notNull().references(() => products.id, { onDelete: "cascade" }),
  createdAt: text("created_at").notNull().$defaultFn(() => new Date().toISOString()),
}, (t) => ({
  customerProductUnique: uniqueIndex("wishlists_customer_product_idx").on(t.customerId, t.productId),
  customerIdIdx: index("wishlists_customer_id_idx").on(t.customerId),
}));

export const products = pgTable("products", {
  id: serial("id").primaryKey(),
  siteId: integer("site_id").notNull().references(() => sites.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  slug: text("slug").notNull(),
  description: text("description"),
  image: text("image"),
  category: text("category"),
  sizes: text("sizes"), // JSON string array, e.g. ["S","M","L"]
  colors: text("colors"), // JSON string array, e.g. ["Black","Blue"]
  price: integer("price").notNull(), // Minor currency unit, e.g. cents
  wholesaleTiers: text("wholesale_tiers"), // JSON array: [{ minQuantity, unitPrice }]
  currency: text("currency").notNull().default("usd"),
  inventoryQuantity: integer("inventory_quantity").notNull().default(0),
  status: text("status").notNull().default("draft"), // draft | active | archived
  featured: boolean("featured").notNull().default(false),
  createdAt: text("created_at").notNull().$defaultFn(() => new Date().toISOString()),
  updatedAt: text("updated_at").notNull().$defaultFn(() => new Date().toISOString()),
}, (t) => ({
  siteIdIdx: index("products_site_id_idx").on(t.siteId),
  siteSlugUnique: uniqueIndex("products_site_slug_idx").on(t.siteId, t.slug),
  statusIdx: index("products_status_idx").on(t.status),
}));

// ─── Blog (tenant-scoped) ───────────────────────────────────────────────────

export const blogPosts = pgTable("blog_posts", {
  id: serial("id").primaryKey(),
  siteId: integer("site_id").notNull().references(() => sites.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  slug: text("slug").notNull(),
  excerpt: text("excerpt"),
  content: text("content").notNull(),
  coverImage: text("cover_image"),
  category: text("category"),
  published: boolean("published").notNull().default(false),
  publishedAt: text("published_at"),
  createdAt: text("created_at").notNull().$defaultFn(() => new Date().toISOString()),
  updatedAt: text("updated_at").notNull().$defaultFn(() => new Date().toISOString()),
}, (t) => ({
  siteIdIdx: index("blog_posts_site_id_idx").on(t.siteId),
  siteSlugUnique: uniqueIndex("blog_posts_site_slug_idx").on(t.siteId, t.slug),
  publishedIdx: index("blog_posts_published_idx").on(t.siteId, t.published, t.publishedAt),
}));

// ─── Service catalog (tenant-scoped, non-ecommerce) ─────────────────────────

export const serviceCategories = pgTable("service_categories", {
  id: serial("id").primaryKey(),
  siteId: integer("site_id").notNull().references(() => sites.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  slug: text("slug").notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
}, (t) => ({
  siteIdIdx: index("service_categories_site_id_idx").on(t.siteId),
  siteSlugUnique: uniqueIndex("service_categories_site_slug_idx").on(t.siteId, t.slug),
}));

export const services = pgTable("services", {
  id: serial("id").primaryKey(),
  siteId: integer("site_id").notNull().references(() => sites.id, { onDelete: "cascade" }),
  categoryId: integer("category_id").references(() => serviceCategories.id, { onDelete: "set null" }),
  title: text("title").notNull(),
  description: text("description"),
  image: text("image"),
  featured: boolean("featured").notNull().default(false),
  active: boolean("active").notNull().default(true),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: text("created_at").notNull().$defaultFn(() => new Date().toISOString()),
  updatedAt: text("updated_at").notNull().$defaultFn(() => new Date().toISOString()),
}, (t) => ({
  siteIdIdx: index("services_site_id_idx").on(t.siteId),
  categoryIdIdx: index("services_category_id_idx").on(t.categoryId),
}));

export const carts = pgTable("carts", {
  id: serial("id").primaryKey(),
  siteId: integer("site_id").notNull().references(() => sites.id, { onDelete: "cascade" }),
  customerId: integer("customer_id").references(() => customers.id, { onDelete: "set null" }),
  token: text("token").notNull().unique(),
  email: text("email"),
  currency: text("currency").notNull().default("usd"),
  promotionCode: text("promotion_code"),
  createdAt: text("created_at").notNull().$defaultFn(() => new Date().toISOString()),
  updatedAt: text("updated_at").notNull().$defaultFn(() => new Date().toISOString()),
}, (t) => ({
  siteIdIdx: index("carts_site_id_idx").on(t.siteId),
  customerIdIdx: index("carts_customer_id_idx").on(t.customerId),
}));

export const cartItems = pgTable("cart_items", {
  id: serial("id").primaryKey(),
  cartId: integer("cart_id").notNull().references(() => carts.id, { onDelete: "cascade" }),
  productId: integer("product_id").notNull().references(() => products.id, { onDelete: "restrict" }),
  selectedOptions: text("selected_options").notNull().default("{}"),
  quantity: integer("quantity").notNull().default(1),
  unitPrice: integer("unit_price").notNull(),
}, (t) => ({
  cartIdIdx: index("cart_items_cart_id_idx").on(t.cartId),
  cartProductOptionsUnique: uniqueIndex("cart_items_cart_product_options_idx").on(t.cartId, t.productId, t.selectedOptions),
}));

export const promotions = pgTable("promotions", {
  id: serial("id").primaryKey(),
  siteId: integer("site_id").notNull().references(() => sites.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  code: text("code").notNull(),
  status: text("status").notNull().default("draft"),
  type: text("type").notNull(), // percentage | fixed | free_shipping
  value: integer("value").notNull().default(0), // percentage basis points or minor currency units
  minimumSubtotal: integer("minimum_subtotal").notNull().default(0),
  productIds: text("product_ids"),
  categories: text("categories"),
  startsAt: text("starts_at"),
  endsAt: text("ends_at"),
  usageLimit: integer("usage_limit"),
  perCustomerLimit: integer("per_customer_limit"),
  firstOrderOnly: boolean("first_order_only").notNull().default(false),
  createdAt: text("created_at").notNull().$defaultFn(() => new Date().toISOString()),
  updatedAt: text("updated_at").notNull().$defaultFn(() => new Date().toISOString()),
}, (t) => ({
  siteCodeUnique: uniqueIndex("promotions_site_code_idx").on(t.siteId, t.code),
  siteStatusIdx: index("promotions_site_status_idx").on(t.siteId, t.status),
}));

export const paymentConfigurations = pgTable("payment_configurations", {
  id: serial("id").primaryKey(),
  siteId: integer("site_id").notNull().references(() => sites.id, { onDelete: "cascade" }),
  provider: text("provider").notNull(), // stripe_connect initially
  enabled: boolean("enabled").notNull().default(false),
  accountId: text("account_id"),
  settings: text("settings"), // Non-secret provider configuration JSON
  createdAt: text("created_at").notNull().$defaultFn(() => new Date().toISOString()),
  updatedAt: text("updated_at").notNull().$defaultFn(() => new Date().toISOString()),
}, (t) => ({
  siteProviderUnique: uniqueIndex("payment_configurations_site_provider_idx").on(t.siteId, t.provider),
}));

export const orders = pgTable("orders", {
  id: serial("id").primaryKey(),
  siteId: integer("site_id").notNull().references(() => sites.id, { onDelete: "cascade" }),
  customerId: integer("customer_id").references(() => customers.id, { onDelete: "set null" }),
  orderNumber: text("order_number").notNull().unique(),
  email: text("email").notNull(),
  customerName: text("customer_name"),
  phone: text("phone"),
  addressLine1: text("address_line_1"),
  addressLine2: text("address_line_2"),
  city: text("city"),
  state: text("state"),
  postalCode: text("postal_code"),
  country: text("country"),
  deliveryNotes: text("delivery_notes"),
  currency: text("currency").notNull(),
  subtotal: integer("subtotal").notNull(),
  discountAmount: integer("discount_amount").notNull().default(0),
  shippingAmount: integer("shipping_amount").notNull().default(0),
  taxAmount: integer("tax_amount").notNull().default(0),
  total: integer("total").notNull(),
  promotionId: integer("promotion_id").references(() => promotions.id, { onDelete: "set null" }),
  promotionCode: text("promotion_code"),
  promotionSnapshot: text("promotion_snapshot"),
  status: text("status").notNull().default("pending"), // pending | paid | fulfilled | cancelled
  paymentStatus: text("payment_status").notNull().default("pending"),
  paymentProvider: text("payment_provider"),
  providerPaymentId: text("provider_payment_id"),
  inventoryStatus: text("inventory_status").notNull().default("none"), // none | reserved | committed | released
  inventoryReservedAt: text("inventory_reserved_at"),
  inventoryExpiresAt: text("inventory_expires_at"),
  inventoryFinalizedAt: text("inventory_finalized_at"),
  createdAt: text("created_at").notNull().$defaultFn(() => new Date().toISOString()),
  updatedAt: text("updated_at").notNull().$defaultFn(() => new Date().toISOString()),
}, (t) => ({
  siteIdIdx: index("orders_site_id_idx").on(t.siteId),
  customerIdIdx: index("orders_customer_id_idx").on(t.customerId),
  statusIdx: index("orders_status_idx").on(t.status),
  inventoryExpiryIdx: index("orders_inventory_expiry_idx").on(t.inventoryStatus, t.inventoryExpiresAt),
  createdAtIdx: index("orders_created_at_idx").on(t.createdAt),
}));

export const orderItems = pgTable("order_items", {
  id: serial("id").primaryKey(),
  orderId: integer("order_id").notNull().references(() => orders.id, { onDelete: "cascade" }),
  productId: integer("product_id").references(() => products.id, { onDelete: "set null" }),
  title: text("title").notNull(),
  selectedOptions: text("selected_options").notNull().default("{}"),
  quantity: integer("quantity").notNull(),
  unitPrice: integer("unit_price").notNull(),
}, (t) => ({
  orderIdIdx: index("order_items_order_id_idx").on(t.orderId),
}));

export const promotionRedemptions = pgTable("promotion_redemptions", {
  id: serial("id").primaryKey(),
  siteId: integer("site_id").notNull().references(() => sites.id, { onDelete: "cascade" }),
  promotionId: integer("promotion_id").notNull().references(() => promotions.id, { onDelete: "restrict" }),
  orderId: integer("order_id").notNull().references(() => orders.id, { onDelete: "cascade" }),
  email: text("email").notNull(),
  amount: integer("amount").notNull(),
  createdAt: text("created_at").notNull().$defaultFn(() => new Date().toISOString()),
}, (t) => ({
  orderPromotionUnique: uniqueIndex("promotion_redemptions_order_idx").on(t.orderId, t.promotionId),
  promotionIdx: index("promotion_redemptions_promotion_idx").on(t.promotionId),
  customerIdx: index("promotion_redemptions_customer_idx").on(t.siteId, t.email, t.promotionId),
}));

// ─── Activity Logs (multi-tenant) ────────────────────────────────────────────

export const activityLogs = pgTable("activity_logs", {
  id: serial("id").primaryKey(),
  siteId: integer("site_id").references(() => sites.id, { onDelete: "cascade" }),
  userId: integer("user_id").references(() => adminUsers.id, { onDelete: "set null" }),
  userName: text("user_name").notNull(),
  userRole: text("user_role").notNull(),
  action: text("action").notNull(), // create | update | delete | status_change | login | logout
  entity: text("entity").notNull(), // settings | gallery | menu | booking | page | site | user | media | navigation | home_section | page_block
  entityId: integer("entity_id"),
  entityName: text("entity_name"),
  details: text("details"), // JSON string with old/new values or description
  ipAddress: text("ip_address"),
  createdAt: text("created_at")
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
}, (t) => ({
  siteIdIdx: index("activity_logs_site_id_idx").on(t.siteId),
  userIdIdx: index("activity_logs_user_id_idx").on(t.userId),
  actionIdx: index("activity_logs_action_idx").on(t.action),
  entityIdx: index("activity_logs_entity_idx").on(t.entity),
  createdAtIdx: index("activity_logs_created_at_idx").on(t.createdAt),
}));

export const rateLimitBuckets = pgTable("rate_limit_buckets", {
  key: text("key").primaryKey(),
  count: integer("count").notNull().default(0),
  resetAt: text("reset_at").notNull(),
  updatedAt: text("updated_at")
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
});

// ─── Webhooks ───────────────────────────────────────────────────────────────

export const webhooks = pgTable("webhooks", {
  id: serial("id").primaryKey(),
  siteId: integer("site_id").notNull().references(() => sites.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  url: text("url").notNull(),
  secret: text("secret"),
  events: text("events").notNull().default("[]"), // JSON array of event types
  active: boolean("active").notNull().default(true),
  createdAt: text("created_at").notNull().$defaultFn(() => new Date().toISOString()),
  updatedAt: text("updated_at").notNull().$defaultFn(() => new Date().toISOString()),
}, (t) => ({
  siteIdIdx: index("webhooks_site_id_idx").on(t.siteId),
}));

export const webhookDeliveries = pgTable("webhook_deliveries", {
  id: serial("id").primaryKey(),
  webhookId: integer("webhook_id").notNull().references(() => webhooks.id, { onDelete: "cascade" }),
  event: text("event").notNull(),
  payload: text("payload").notNull(),
  status: text("status").notNull().default("pending"), // pending | success | failed
  statusCode: integer("status_code"),
  response: text("response"),
  attempts: integer("attempts").notNull().default(0),
  nextRetryAt: text("next_retry_at"),
  createdAt: text("created_at").notNull().$defaultFn(() => new Date().toISOString()),
}, (t) => ({
  webhookIdIdx: index("webhook_deliveries_webhook_id_idx").on(t.webhookId),
  statusIdx: index("webhook_deliveries_status_idx").on(t.status),
  eventIdx: index("webhook_deliveries_event_idx").on(t.event),
  createdAtIdx: index("webhook_deliveries_created_at_idx").on(t.createdAt),
}));

export type Webhook = typeof webhooks.$inferSelect;
export type WebhookDelivery = typeof webhookDeliveries.$inferSelect;

// ─── Subscription Billing ───────────────────────────────────────────────────

export const plans = pgTable("plans", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  description: text("description"),
  price: integer("price").notNull(), // Minor currency unit (cents)
  currency: text("currency").notNull().default("usd"),
  interval: text("interval").notNull().default("month"), // month | year
  features: text("features"), // JSON array of feature strings
  maxPages: integer("max_pages").notNull().default(10),
  maxProducts: integer("max_products").notNull().default(50),
  maxStorage: integer("max_storage_mb").notNull().default(1000), // MB
  maxBandwidth: integer("max_bandwidth_gb").notNull().default(10), // GB
  stripePriceId: text("stripe_price_id"),
  active: boolean("active").notNull().default(true),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: text("created_at").notNull().$defaultFn(() => new Date().toISOString()),
  updatedAt: text("updated_at").notNull().$defaultFn(() => new Date().toISOString()),
});

export const subscriptions = pgTable("subscriptions", {
  id: serial("id").primaryKey(),
  siteId: integer("site_id").notNull().references(() => sites.id, { onDelete: "cascade" }),
  planId: integer("plan_id").notNull().references(() => plans.id, { onDelete: "restrict" }),
  status: text("status").notNull().default("active"), // active | past_due | cancelled | trialing
  stripeSubscriptionId: text("stripe_subscription_id"),
  stripeCustomerId: text("stripe_customer_id"),
  currentPeriodStart: text("current_period_start"),
  currentPeriodEnd: text("current_period_end"),
  cancelAt: text("cancel_at"),
  createdAt: text("created_at").notNull().$defaultFn(() => new Date().toISOString()),
  updatedAt: text("updated_at").notNull().$defaultFn(() => new Date().toISOString()),
}, (t) => ({
  siteIdIdx: index("subscriptions_site_id_idx").on(t.siteId),
  statusIdx: index("subscriptions_status_idx").on(t.status),
  stripeSubIdx: index("subscriptions_stripe_sub_idx").on(t.stripeSubscriptionId),
}));

export type Plan = typeof plans.$inferSelect;
export type Subscription = typeof subscriptions.$inferSelect;

// ─── Internationalization (i18n) ────────────────────────────────────────────

export const siteLocales = pgTable("site_locales", {
  id: serial("id").primaryKey(),
  siteId: integer("site_id").notNull().references(() => sites.id, { onDelete: "cascade" }),
  code: text("code").notNull(), // e.g. "en", "fr", "es"
  name: text("name").notNull(), // e.g. "English", "French", "Spanish"
  isDefault: boolean("is_default").notNull().default(false),
  active: boolean("active").notNull().default(true),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: text("created_at").notNull().$defaultFn(() => new Date().toISOString()),
}, (t) => ({
  siteIdIdx: index("site_locales_site_id_idx").on(t.siteId),
  siteCodeUnique: uniqueIndex("site_locales_site_code_idx").on(t.siteId, t.code),
}));

export const pageTranslations = pgTable("page_translations", {
  id: serial("id").primaryKey(),
  pageId: integer("page_id").notNull().references(() => pages.id, { onDelete: "cascade" }),
  locale: text("locale").notNull(), // locale code e.g. "fr"
  title: text("title"),
  slug: text("slug"),
  description: text("description"),
  metaTitle: text("meta_title"),
  metaDescription: text("meta_description"),
  createdAt: text("created_at").notNull().$defaultFn(() => new Date().toISOString()),
  updatedAt: text("updated_at").notNull().$defaultFn(() => new Date().toISOString()),
}, (t) => ({
  pageIdIdx: index("page_translations_page_id_idx").on(t.pageId),
  pageLocaleUnique: uniqueIndex("page_translations_page_locale_idx").on(t.pageId, t.locale),
}));

export const blockTranslations = pgTable("block_translations", {
  id: serial("id").primaryKey(),
  blockId: integer("block_id").notNull().references(() => pageBlocks.id, { onDelete: "cascade" }),
  locale: text("locale").notNull(),
  title: text("title"),
  config: text("config"), // Translated config JSON
  createdAt: text("created_at").notNull().$defaultFn(() => new Date().toISOString()),
  updatedAt: text("updated_at").notNull().$defaultFn(() => new Date().toISOString()),
}, (t) => ({
  blockIdIdx: index("block_translations_block_id_idx").on(t.blockId),
  blockLocaleUnique: uniqueIndex("block_translations_block_locale_idx").on(t.blockId, t.locale),
}));

// ─── A/B Testing ────────────────────────────────────────────────────────────

export const experiments = pgTable("experiments", {
  id: serial("id").primaryKey(),
  siteId: integer("site_id").notNull().references(() => sites.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  slug: text("slug").notNull(),
  description: text("description"),
  status: text("status").notNull().default("draft"), // draft | running | paused | completed
  trafficPercent: integer("traffic_percent").notNull().default(50), // 0-100
  variants: text("variants").notNull().default("[]"), // JSON array: [{id, name, weight}]
  createdAt: text("created_at").notNull().$defaultFn(() => new Date().toISOString()),
  updatedAt: text("updated_at").notNull().$defaultFn(() => new Date().toISOString()),
}, (t) => ({
  siteIdIdx: index("experiments_site_id_idx").on(t.siteId),
  statusIdx: index("experiments_status_idx").on(t.status),
}));

export const experimentAssignments = pgTable("experiment_assignments", {
  id: serial("id").primaryKey(),
  experimentId: integer("experiment_id").notNull().references(() => experiments.id, { onDelete: "cascade" }),
  visitorId: text("visitor_id").notNull(), // Cookie-based anonymous ID
  variantId: text("variant_id").notNull(),
  assignedAt: text("assigned_at").notNull().$defaultFn(() => new Date().toISOString()),
}, (t) => ({
  experimentIdIdx: index("experiment_assignments_experiment_id_idx").on(t.experimentId),
  visitorIdIdx: index("experiment_assignments_visitor_id_idx").on(t.visitorId),
  experimentVisitorUnique: uniqueIndex("experiment_assignments_exp_visitor_idx").on(t.experimentId, t.visitorId),
}));

export const experimentEvents = pgTable("experiment_events", {
  id: serial("id").primaryKey(),
  experimentId: integer("experiment_id").notNull().references(() => experiments.id, { onDelete: "cascade" }),
  visitorId: text("visitor_id").notNull(),
  variantId: text("variant_id").notNull(),
  event: text("event").notNull(), // impression | conversion
  value: integer("value"), // Optional conversion value (cents)
  createdAt: text("created_at").notNull().$defaultFn(() => new Date().toISOString()),
}, (t) => ({
  experimentIdIdx: index("experiment_events_experiment_id_idx").on(t.experimentId),
  eventIdx: index("experiment_events_event_idx").on(t.event),
  createdAtIdx: index("experiment_events_created_at_idx").on(t.createdAt),
}));

export type SiteLocale = typeof siteLocales.$inferSelect;
export type PageTranslation = typeof pageTranslations.$inferSelect;
export type BlockTranslation = typeof blockTranslations.$inferSelect;
export type Experiment = typeof experiments.$inferSelect;
export type ExperimentAssignment = typeof experimentAssignments.$inferSelect;
export type ExperimentEvent = typeof experimentEvents.$inferSelect;

// ─── Advanced Analytics ──────────────────────────────────────────────────────

export const pageViews = pgTable("page_views", {
  id: serial("id").primaryKey(),
  siteId: integer("site_id").notNull().references(() => sites.id, { onDelete: "cascade" }),
  pageId: integer("page_id").references(() => pages.id, { onDelete: "set null" }),
  path: text("path").notNull(),
  visitorId: text("visitor_id").notNull(),
  referrer: text("referrer"),
  userAgent: text("user_agent"),
  ipHash: text("ip_hash"), // Hashed IP for unique visitor counting
  country: text("country"),
  device: text("device"), // desktop | mobile | tablet
  browser: text("browser"),
  os: text("os"),
  utmSource: text("utm_source"),
  utmMedium: text("utm_medium"),
  utmCampaign: text("utm_campaign"),
  duration: integer("duration"), // Time on page in seconds
  createdAt: text("created_at").notNull().$defaultFn(() => new Date().toISOString()),
}, (t) => ({
  siteIdIdx: index("page_views_site_id_idx").on(t.siteId),
  pageIdIdx: index("page_views_page_id_idx").on(t.pageId),
  pathIdx: index("page_views_path_idx").on(t.path),
  visitorIdIdx: index("page_views_visitor_id_idx").on(t.visitorId),
  createdAtIdx: index("page_views_created_at_idx").on(t.createdAt),
  countryIdx: index("page_views_country_idx").on(t.country),
}));

export const clickEvents = pgTable("click_events", {
  id: serial("id").primaryKey(),
  siteId: integer("site_id").notNull().references(() => sites.id, { onDelete: "cascade" }),
  visitorId: text("visitor_id").notNull(),
  path: text("path").notNull(),
  selector: text("selector"), // CSS selector of clicked element
  x: integer("x"), // Normalized x position (0-1000)
  y: integer("y"), // Normalized y position (0-1000)
  label: text("label"), // Text label of clicked element
  createdAt: text("created_at").notNull().$defaultFn(() => new Date().toISOString()),
}, (t) => ({
  siteIdIdx: index("click_events_site_id_idx").on(t.siteId),
  pathIdx: index("click_events_path_idx").on(t.path),
  createdAtIdx: index("click_events_created_at_idx").on(t.createdAt),
}));

export const conversionFunnels = pgTable("conversion_funnels", {
  id: serial("id").primaryKey(),
  siteId: integer("site_id").notNull().references(() => sites.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  steps: text("steps").notNull().default("[]"), // JSON array of path patterns
  createdAt: text("created_at").notNull().$defaultFn(() => new Date().toISOString()),
}, (t) => ({
  siteIdIdx: index("conversion_funnels_site_id_idx").on(t.siteId),
}));

export type PageView = typeof pageViews.$inferSelect;
export type ClickEvent = typeof clickEvents.$inferSelect;
export type ConversionFunnel = typeof conversionFunnels.$inferSelect;

export type GalleryImage = typeof galleryImages.$inferSelect;
export type MenuCategory = typeof menuCategories.$inferSelect;
export type MenuItem = typeof menuItems.$inferSelect;
export type Booking = typeof bookings.$inferSelect;
export type Message = typeof messages.$inferSelect;
export type Media = typeof media.$inferSelect;
export type AdminUser = typeof adminUsers.$inferSelect;
export type PasswordResetToken = typeof passwordResetTokens.$inferSelect;
export type NavLink = typeof navLinks.$inferSelect;
export type HomeSection = typeof homeSections.$inferSelect;
export type Site = typeof sites.$inferSelect;
export type Page = typeof pages.$inferSelect;
export type PageBlock = typeof pageBlocks.$inferSelect;
export type PageRevision = typeof pageRevisions.$inferSelect;
export type ActivityLog = typeof activityLogs.$inferSelect;
export type Product = typeof products.$inferSelect;
export type BlogPost = typeof blogPosts.$inferSelect;
export type Cart = typeof carts.$inferSelect;
export type CartItem = typeof cartItems.$inferSelect;
export type Promotion = typeof promotions.$inferSelect;
export type PromotionRedemption = typeof promotionRedemptions.$inferSelect;
export type Order = typeof orders.$inferSelect;
export type OrderItem = typeof orderItems.$inferSelect;
export type PaymentConfiguration = typeof paymentConfigurations.$inferSelect;
export type ServiceCategory = typeof serviceCategories.$inferSelect;
export type Service = typeof services.$inferSelect;
export type UserFeature = typeof userFeatures.$inferSelect;
export type RateLimitBucket = typeof rateLimitBuckets.$inferSelect;
export type NewUserFeature = typeof userFeatures.$inferInsert;
export type Customer = typeof customers.$inferSelect;
export type CustomerAddress = typeof customerAddresses.$inferSelect;
export type Wishlist = typeof wishlists.$inferSelect;
export type NewsletterSubscriber = typeof newsletterSubscribers.$inferSelect;
export type EmailCampaign = typeof emailCampaigns.$inferSelect;
export type EmailJob = typeof emailJobs.$inferSelect;

export type NewBooking = typeof bookings.$inferInsert;
export type NewSite = typeof sites.$inferInsert;
export type NewPage = typeof pages.$inferInsert;
export type NewPageBlock = typeof pageBlocks.$inferInsert;

// ─── AI Content Chunks (RAG index) ───────────────────────────────────────────

export const aiChunks = pgTable("ai_chunks", {
  id: serial("id").primaryKey(),
  siteId: integer("site_id").references(() => sites.id, { onDelete: "cascade" }),
  sourceType: text("source_type").notNull(), // page | block | blog | product | service | menu
  sourceId: integer("source_id"),
  title: text("title").notNull(),
  content: text("content").notNull(),
  path: text("path"),
  embedding: text("embedding"), // JSON array of floats
  createdAt: text("created_at").notNull().$defaultFn(() => new Date().toISOString()),
}, (t) => ({
  siteIdIdx: index("ai_chunks_site_id_idx").on(t.siteId),
  sourceIdx: index("ai_chunks_source_idx").on(t.sourceType, t.sourceId),
}));

export type AiChunk = typeof aiChunks.$inferSelect;

// ─── Error Logs ──────────────────────────────────────────────────────────────

export const errorLogs = pgTable("error_logs", {
  id: serial("id").primaryKey(),
  siteId: integer("site_id").references(() => sites.id, { onDelete: "cascade" }),
  level: text("level").notNull().default("error"), // error | warning | info
  message: text("message").notNull(),
  stack: text("stack"),
  url: text("url"),
  method: text("method"),
  statusCode: integer("status_code"),
  userAgent: text("user_agent"),
  ipAddress: text("ip_address"),
  context: text("context"), // JSON string for extra metadata
  resolved: integer("resolved").notNull().default(0), // 0 = unresolved, 1 = resolved
  createdAt: text("created_at").notNull().$defaultFn(() => new Date().toISOString()),
}, (t) => ({
  siteIdIdx: index("error_logs_site_id_idx").on(t.siteId),
  levelIdx: index("error_logs_level_idx").on(t.level),
  resolvedIdx: index("error_logs_resolved_idx").on(t.resolved),
  createdAtIdx: index("error_logs_created_at_idx").on(t.createdAt),
}));

export type ErrorLog = typeof errorLogs.$inferSelect;
