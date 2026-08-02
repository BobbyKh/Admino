import * as pg from "./schema-postgres";

/**
 * PostgreSQL-only schema — app imports tables from "@/lib/db/schema".
 */
export const sites = pg.sites;
export const pages = pg.pages;
export const pageBlocks = pg.pageBlocks;
export const settings = pg.settings;
export const galleryImages = pg.galleryImages;
export const menuCategories = pg.menuCategories;
export const menuItems = pg.menuItems;
export const bookings = pg.bookings;
export const messages = pg.messages;
export const media = pg.media;
export const adminUsers = pg.adminUsers;
export const navLinks = pg.navLinks;
export const homeSections = pg.homeSections;

export type Site = pg.Site;
export type Page = pg.Page;
export type PageBlock = pg.PageBlock;
export type GalleryImage = pg.GalleryImage;
export type MenuCategory = pg.MenuCategory;
export type MenuItem = pg.MenuItem;
export type Booking = pg.Booking;
export type Message = pg.Message;
export type Media = pg.Media;
export type AdminUser = pg.AdminUser;
export type NavLink = pg.NavLink;
export type HomeSection = pg.HomeSection;

export type NewBooking = pg.NewBooking;
export type NewSite = pg.NewSite;
export type NewPage = pg.NewPage;
export type NewPageBlock = pg.NewPageBlock;
