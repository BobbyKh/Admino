import {
  pgTable,
  text,
  integer,
  boolean,
  serial,
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
  template: text("template").notNull().default("default"),
  published: boolean("published").notNull().default(false),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: text("created_at")
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
  updatedAt: text("updated_at")
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
});

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
});

// ─── Existing Tables (with siteId FK added) ──────────────────────────────────

export const settings = pgTable("settings", {
  key: text("key").primaryKey(),
  siteId: integer("site_id").references(() => sites.id, { onDelete: "cascade" }),
  value: text("value").notNull(),
  updatedAt: text("updated_at")
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
    
});

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
});

export const menuCategories = pgTable("menu_categories", {
  id: serial("id").primaryKey(),
  siteId: integer("site_id").references(() => sites.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  description: text("description"),
  sortOrder: integer("sort_order").notNull().default(0),
});

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
});

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
});

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
});

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
});

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
});

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
});

export const adminUsers = pgTable("admin_users", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  role: text("role").notNull().default("admin"), // super_admin | admin | editor | viewer
  createdAt: text("created_at")
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
});

export type GalleryImage = typeof galleryImages.$inferSelect;
export type MenuCategory = typeof menuCategories.$inferSelect;
export type MenuItem = typeof menuItems.$inferSelect;
export type Booking = typeof bookings.$inferSelect;
export type Message = typeof messages.$inferSelect;
export type Media = typeof media.$inferSelect;
export type AdminUser = typeof adminUsers.$inferSelect;
export type NavLink = typeof navLinks.$inferSelect;
export type HomeSection = typeof homeSections.$inferSelect;
export type Site = typeof sites.$inferSelect;
export type Page = typeof pages.$inferSelect;
export type PageBlock = typeof pageBlocks.$inferSelect;

export type NewBooking = typeof bookings.$inferInsert;
export type NewSite = typeof sites.$inferInsert;
export type NewPage = typeof pages.$inferInsert;
export type NewPageBlock = typeof pageBlocks.$inferInsert;
