import { isPostgres } from "./client";
import * as sqlite from "./schema-sqlite";
import * as postgres from "./schema-postgres";

/**
 * Dialect facade — the app imports tables from "@/lib/db/schema" and gets the
 * runtime-selected dialect's table objects (SQLite locally, Postgres in prod),
 * typed through the SQLite schema so row shapes stay consistent everywhere.
 */
export const settings = (isPostgres ? postgres.settings : sqlite.settings) as typeof sqlite.settings;
export const galleryImages = (isPostgres
  ? postgres.galleryImages
  : sqlite.galleryImages) as typeof sqlite.galleryImages;
export const menuCategories = (isPostgres
  ? postgres.menuCategories
  : sqlite.menuCategories) as typeof sqlite.menuCategories;
export const menuItems = (isPostgres ? postgres.menuItems : sqlite.menuItems) as typeof sqlite.menuItems;
export const bookings = (isPostgres ? postgres.bookings : sqlite.bookings) as typeof sqlite.bookings;
export const messages = (isPostgres ? postgres.messages : sqlite.messages) as typeof sqlite.messages;
export const media = (isPostgres ? postgres.media : sqlite.media) as typeof sqlite.media;
export const adminUsers = (isPostgres ? postgres.adminUsers : sqlite.adminUsers) as typeof sqlite.adminUsers;
export const navLinks = (isPostgres ? postgres.navLinks : sqlite.navLinks) as typeof sqlite.navLinks;
export const homeSections = (isPostgres ? postgres.homeSections : sqlite.homeSections) as typeof sqlite.homeSections;

export type GalleryImage = typeof sqlite.galleryImages.$inferSelect;
export type MenuCategory = typeof sqlite.menuCategories.$inferSelect;
export type MenuItem = typeof sqlite.menuItems.$inferSelect;
export type Booking = typeof sqlite.bookings.$inferSelect;
export type Message = typeof sqlite.messages.$inferSelect;
export type Media = typeof sqlite.media.$inferSelect;
export type AdminUser = typeof sqlite.adminUsers.$inferSelect;
export type NavLink = typeof sqlite.navLinks.$inferSelect;
export type HomeSection = typeof sqlite.homeSections.$inferSelect;

export type NewBooking = typeof sqlite.bookings.$inferInsert;
