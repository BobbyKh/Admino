"use server";

import { and, eq, inArray, notInArray } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  blogPosts,
  bookings,
  cartItems,
  carts,
  galleryImages,
  media,
  menuCategories,
  menuItems,
  messages,
  navLinks,
  orderItems,
  orders,
  pageBlocks,
  pageRevisions,
  pages,
  paymentConfigurations,
  products,
  serviceCategories,
  services,
  settings,
  sites,
} from "@/lib/db/schema";
import { requireSiteAccess } from "@/lib/tenant-access";
import { SECRET_SETTING_KEYS } from "@/lib/settings";

export async function exportTenantData(siteId: number) {
  if (!Number.isInteger(siteId) || siteId < 1) throw new Error("Invalid site.");
  await requireSiteAccess(siteId);

  const [site] = await db.select().from(sites).where(eq(sites.id, siteId));
  if (!site) throw new Error("Site not found.");

  const [sitePages, siteCarts, siteOrders] = await Promise.all([
    db.select().from(pages).where(eq(pages.siteId, siteId)),
    db.select().from(carts).where(eq(carts.siteId, siteId)),
    db.select().from(orders).where(eq(orders.siteId, siteId)),
  ]);
  const pageIds = sitePages.map((page) => page.id);
  const cartIds = siteCarts.map((cart) => cart.id);
  const orderIds = siteOrders.map((order) => order.id);
  const secretKeys = [...SECRET_SETTING_KEYS, "commerce_payment_stripe_secrets", "commerce_payment_khalti_secrets", "commerce_payment_esewa_secrets"];

  const [
    siteSettings,
    blocks,
    revisions,
    navigation,
    gallery,
    mediaItems,
    categories,
    menu,
    bookingRows,
    messageRows,
    paymentRows,
    productRows,
    blogRows,
    serviceCategoryRows,
    serviceRows,
    cartItemRows,
    orderItemRows,
  ] = await Promise.all([
    db.select().from(settings).where(and(eq(settings.siteId, siteId), notInArray(settings.key, secretKeys))),
    pageIds.length ? db.select().from(pageBlocks).where(inArray(pageBlocks.pageId, pageIds)) : [],
    pageIds.length ? db.select({ id: pageRevisions.id, pageId: pageRevisions.pageId, userId: pageRevisions.userId, label: pageRevisions.label, createdAt: pageRevisions.createdAt }).from(pageRevisions).where(inArray(pageRevisions.pageId, pageIds)) : [],
    db.select().from(navLinks).where(eq(navLinks.siteId, siteId)),
    db.select().from(galleryImages).where(eq(galleryImages.siteId, siteId)),
    db.select().from(media).where(eq(media.siteId, siteId)),
    db.select().from(menuCategories).where(eq(menuCategories.siteId, siteId)),
    db.select().from(menuItems).where(eq(menuItems.siteId, siteId)),
    db.select().from(bookings).where(eq(bookings.siteId, siteId)),
    db.select().from(messages).where(eq(messages.siteId, siteId)),
    db.select().from(paymentConfigurations).where(eq(paymentConfigurations.siteId, siteId)),
    db.select().from(products).where(eq(products.siteId, siteId)),
    db.select().from(blogPosts).where(eq(blogPosts.siteId, siteId)),
    db.select().from(serviceCategories).where(eq(serviceCategories.siteId, siteId)),
    db.select().from(services).where(eq(services.siteId, siteId)),
    cartIds.length ? db.select().from(cartItems).where(inArray(cartItems.cartId, cartIds)) : [],
    orderIds.length ? db.select().from(orderItems).where(inArray(orderItems.orderId, orderIds)) : [],
  ]);

  return {
    exportedAt: new Date().toISOString(),
    app: "Admino",
    version: 1,
    site,
    settings: siteSettings,
    pages: sitePages,
    pageBlocks: blocks,
    pageRevisions: revisions,
    navigation,
    galleryImages: gallery,
    media: mediaItems,
    menuCategories: categories,
    menuItems: menu,
    bookings: bookingRows,
    messages: messageRows,
    paymentConfigurations: paymentRows,
    products: productRows,
    blogPosts: blogRows,
    serviceCategories: serviceCategoryRows,
    services: serviceRows,
    carts: siteCarts,
    cartItems: cartItemRows,
    orders: siteOrders,
    orderItems: orderItemRows,
  };
}
