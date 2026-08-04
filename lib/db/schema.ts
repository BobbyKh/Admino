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
export const activityLogs = pg.activityLogs;
export const products = pg.products;
export const carts = pg.carts;
export const cartItems = pg.cartItems;
export const paymentConfigurations = pg.paymentConfigurations;
export const orders = pg.orders;
export const orderItems = pg.orderItems;

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
export type ActivityLog = pg.ActivityLog;
export type Product = pg.Product;
export type Cart = pg.Cart;
export type CartItem = pg.CartItem;
export type Order = pg.Order;
export type OrderItem = pg.OrderItem;
export type PaymentConfiguration = pg.PaymentConfiguration;

export type NewBooking = pg.NewBooking;
export type NewSite = pg.NewSite;
export type NewPage = pg.NewPage;
export type NewPageBlock = pg.NewPageBlock;
