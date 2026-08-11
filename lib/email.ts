import "server-only";

import { cache } from "react";
import { and, eq } from "drizzle-orm";
import nodemailer from "nodemailer";
import { db } from "@/lib/db";
import { adminUsers, settings } from "@/lib/db/schema";
import type { Booking, Order, OrderItem } from "@/lib/db/schema";
import { formatBookingDate } from "@/lib/format";
import { getSettingsRows } from "@/lib/settings-admin";
import { escapeHtml } from "@/lib/sanitize";

/**
 * SMTP config resolved in this order:
 *   1. Admin panel settings (Settings → Email) — saved to the DB
 *   2. Environment variables (SMTP_HOST / SMTP_USER / SMTP_PASS / …)
 * So email credentials can be managed from the admin UI.
 */
const getSmtpConfig = cache(async () => {
  const rows = await getSettingsRows();
  const user = rows.smtpUser || process.env.SMTP_USER || "";
  const host = rows.smtpHost || process.env.SMTP_HOST || "";
  const pass = rows.smtpPass || process.env.SMTP_PASS || "";
  return {
    host,
    user,
    pass,
    port: Number(rows.smtpPort || process.env.SMTP_PORT || 587),
    secure: (rows.smtpSecure || process.env.SMTP_SECURE || "false") === "true",
    from:
      rows.smtpFrom ||
      process.env.SMTP_FROM ||
      user ||
      `no-reply@${process.env.PLATFORM_DOMAIN ?? "example.com"}`,
    notifyTo:
      rows.adminNotifyEmail ||
      process.env.ADMIN_NOTIFY_EMAIL ||
      user ||
      `admin@${process.env.PLATFORM_DOMAIN ?? "example.com"}`,
  };
});

async function sendMail(to: string, subject: string, html: string) {
  const config = await getSmtpConfig();
  if (!config.host || !config.user || !config.pass) {
    console.log(`[email:not-configured] To: ${to} | Subject: ${subject}`);
    return { skipped: true } as const;
  }
  const transporter = nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth: {
      user: config.user,
      pass: config.pass,
    },
  });
  await transporter.sendMail({
    from: config.from,
    to,
    subject,
    html,
  });
  return { skipped: false } as const;
}

export async function sendBookingConfirmation(booking: Booking) {
  const when = formatBookingDate(booking.date, booking.time);
  const siteName = await getSiteName(booking.siteId ?? 0);
  const html = `
  <div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;color:#1a1a1a">
    <h2 style="color:#166534">Booking Received — ${escapeHtml(siteName)}</h2>
    <p>Dear <strong>${escapeHtml(booking.name)}</strong>,</p>
    <p>Thank you for choosing ${escapeHtml(siteName)}! Your booking request has been received and we will confirm it shortly.</p>
    <table style="border-collapse:collapse;width:100%;margin:16px 0" cellpadding="8">
      <tr><td style="border:1px solid #ddd"><strong>Date &amp; Time</strong></td><td style="border:1px solid #ddd">${escapeHtml(when)}</td></tr>
      <tr><td style="border:1px solid #ddd"><strong>Guests</strong></td><td style="border:1px solid #ddd">${booking.guests}</td></tr>
      ${booking.occasion ? `<tr><td style="border:1px solid #ddd"><strong>Occasion</strong></td><td style="border:1px solid #ddd">${escapeHtml(booking.occasion)}</td></tr>` : ""}
      ${booking.notes ? `<tr><td style="border:1px solid #ddd"><strong>Special requests</strong></td><td style="border:1px solid #ddd">${escapeHtml(booking.notes)}</td></tr>` : ""}
      <tr><td style="border:1px solid #ddd"><strong>Booking ID</strong></td><td style="border:1px solid #ddd">#${booking.id}</td></tr>
    </table>
    <p style="color:#666;font-size:12px">${escapeHtml(siteName)}</p>
  </div>`;
  return sendMail(booking.email, `Booking received — ${siteName}`, html);
}

export async function sendBookingAdminAlert(booking: Booking) {
  const when = formatBookingDate(booking.date, booking.time);
  const siteName = await getSiteName(booking.siteId ?? 0);
  const html = `
  <div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;color:#1a1a1a">
    <h2 style="color:#166534">New Booking Request #${booking.id}</h2>
    <table style="border-collapse:collapse;width:100%;margin:16px 0" cellpadding="8">
      <tr><td style="border:1px solid #ddd"><strong>Name</strong></td><td style="border:1px solid #ddd">${escapeHtml(booking.name)}</td></tr>
      <tr><td style="border:1px solid #ddd"><strong>Email</strong></td><td style="border:1px solid #ddd">${escapeHtml(booking.email)}</td></tr>
      <tr><td style="border:1px solid #ddd"><strong>Phone</strong></td><td style="border:1px solid #ddd">${escapeHtml(booking.phone)}</td></tr>
      <tr><td style="border:1px solid #ddd"><strong>Date &amp; Time</strong></td><td style="border:1px solid #ddd">${escapeHtml(when)}</td></tr>
      <tr><td style="border:1px solid #ddd"><strong>Guests</strong></td><td style="border:1px solid #ddd">${booking.guests}</td></tr>
      ${booking.occasion ? `<tr><td style="border:1px solid #ddd"><strong>Occasion</strong></td><td style="border:1px solid #ddd">${escapeHtml(booking.occasion)}</td></tr>` : ""}
    </table>
    <p><a href="${process.env.SITE_URL ?? "http://localhost:3000"}/admin/bookings">Open admin panel</a></p>
  </div>`;
  const { notifyTo } = await getSmtpConfig();
  return sendMail(notifyTo, `New booking request #${booking.id} — ${siteName}`, html);
}

export async function sendBookingStatusEmail(booking: Booking, status: string) {
  const when = formatBookingDate(booking.date, booking.time);
  const siteName = await getSiteName(booking.siteId ?? 0);
  const message =
    status === "confirmed"
      ? "Great news — your table has been <strong>confirmed</strong>! We look forward to hosting you."
      : status === "cancelled"
        ? "Unfortunately your booking has been <strong>cancelled</strong>. Please contact us if this is in error."
        : status === "completed"
          ? `Thank you for visiting ${escapeHtml(siteName)}! We hope you had a wonderful time.`
          : "Your booking is currently pending confirmation.";
  const html = `
  <div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;color:#1a1a1a">
    <h2 style="color:#166534">Booking Update — ${escapeHtml(siteName)}</h2>
    <p>Dear <strong>${escapeHtml(booking.name)}</strong>,</p>
    <p>${message}</p>
    <table style="border-collapse:collapse;width:100%;margin:16px 0" cellpadding="8">
      <tr><td style="border:1px solid #ddd"><strong>Date &amp; Time</strong></td><td style="border:1px solid #ddd">${escapeHtml(when)}</td></tr>
      <tr><td style="border:1px solid #ddd"><strong>Guests</strong></td><td style="border:1px solid #ddd">${booking.guests}</td></tr>
      <tr><td style="border:1px solid #ddd"><strong>Booking ID</strong></td><td style="border:1px solid #ddd">#${booking.id}</td></tr>
    </table>
    <p style="color:#666;font-size:12px">${escapeHtml(siteName)}</p>
  </div>`;
  return sendMail(booking.email, `Booking ${status} — ${siteName}`, html);
}

export async function sendContactAdminAlert(message: {
  name: string;
  email: string;
  phone?: string | null;
  subject: string;
  message: string;
}) {
  const html = `
  <div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;color:#1a1a1a">
    <h2 style="color:#166534">New Contact Message</h2>
    <table style="border-collapse:collapse;width:100%;margin:16px 0" cellpadding="8">
      <tr><td style="border:1px solid #ddd"><strong>Name</strong></td><td style="border:1px solid #ddd">${escapeHtml(message.name)}</td></tr>
      <tr><td style="border:1px solid #ddd"><strong>Email</strong></td><td style="border:1px solid #ddd">${escapeHtml(message.email)}</td></tr>
      ${message.phone ? `<tr><td style="border:1px solid #ddd"><strong>Phone</strong></td><td style="border:1px solid #ddd">${escapeHtml(message.phone)}</td></tr>` : ""}
      <tr><td style="border:1px solid #ddd"><strong>Subject</strong></td><td style="border:1px solid #ddd">${escapeHtml(message.subject)}</td></tr>
      <tr><td style="border:1px solid #ddd" colspan="2"><strong>Message</strong><br/>${escapeHtml(message.message).replace(/\n/g, "<br/>")}</td></tr>
    </table>
    <p><a href="${process.env.SITE_URL ?? "http://localhost:3000"}/admin/messages">Open admin panel</a></p>
  </div>`;
  const { notifyTo } = await getSmtpConfig();
  return sendMail(notifyTo, `New contact message: ${message.subject}`, html);
}

export async function sendPasswordResetEmail(to: string, resetUrl: string) {
  const html = `
  <div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;color:#1a1a1a">
    <h2 style="color:#166534">Reset your Admino password</h2>
    <p>A password reset was requested for this admin account.</p>
    <p><a href="${escapeHtml(resetUrl)}" style="display:inline-block;background:#166534;color:#fff;padding:10px 14px;border-radius:8px;text-decoration:none">Reset password</a></p>
    <p>This link expires in 30 minutes. If you did not request it, you can ignore this email.</p>
    <p style="color:#666;font-size:12px;word-break:break-all">${escapeHtml(resetUrl)}</p>
  </div>`;
  const result = await sendMail(to, "Reset your Admino password", html);
  if (result.skipped) console.log(`[password-reset:url] ${resetUrl}`);
  return result;
}

export async function sendTestEmail(to: string) {
  const html = `
  <div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;color:#1a1a1a">
    <h2 style="color:#166534">SMTP Email Test — Admino</h2>
    <p>This is a test notification email from your Web Builder application.</p>
    <p>If you are receiving this email, your SMTP email settings are configured and working correctly!</p>
    <p style="color:#666;font-size:12px">Sent at ${new Date().toLocaleString()}</p>
  </div>`;
  return sendMail(to, "SMTP Email Test — Admino", html);
}

export async function sendOrderConfirmationEmail(order: Order, items: OrderItem[]) {
  const siteName = await getSiteName(order.siteId);
  const html = orderEmailHtml({
    title: `Order received — ${siteName}`,
    intro: `Thanks for your order. We received <strong>${escapeHtml(order.orderNumber)}</strong> and will update you when payment is confirmed.`,
    order,
    items,
    siteName,
  });
  return sendMail(order.email, `Order received — ${siteName}`, html);
}

export async function sendOrderAdminAlert(order: Order, items: OrderItem[]) {
  const siteName = await getSiteName(order.siteId);
  const html = orderEmailHtml({
    title: `New order — ${siteName}`,
    intro: `A new order needs review in Admino. Payment status: <strong>${escapeHtml(order.paymentStatus)}</strong>.`,
    order,
    items,
    siteName,
    adminLink: `${process.env.SITE_URL ?? "http://localhost:3000"}/admin/commerce/orders`,
  });
  const { notifyTo } = await getSmtpConfig();
  return sendMail(notifyTo, `New order ${order.orderNumber} — ${siteName}`, html);
}

export async function sendOrderPaymentStatusEmail(order: Order, items: OrderItem[], status: "paid" | "failed" | "fulfilled") {
  const siteName = await getSiteName(order.siteId);
  const intro = status === "paid"
    ? `Payment for <strong>${escapeHtml(order.orderNumber)}</strong> is confirmed.`
    : status === "fulfilled"
      ? `Your order <strong>${escapeHtml(order.orderNumber)}</strong> has been marked fulfilled.`
      : `Payment for <strong>${escapeHtml(order.orderNumber)}</strong> could not be verified. Please contact the store if this is incorrect.`;
  const html = orderEmailHtml({ title: `Order ${status} — ${siteName}`, intro, order, items, siteName });
  return sendMail(order.email, `Order ${status} — ${siteName}`, html);
}

function orderEmailHtml({ title, intro, order, items, siteName, adminLink }: { title: string; intro: string; order: Order; items: OrderItem[]; siteName: string; adminLink?: string }) {
  const rows = items.map((item) => `<tr><td style="border:1px solid #ddd">${escapeHtml(item.title)} × ${item.quantity}</td><td style="border:1px solid #ddd;text-align:right">${formatMoney(item.unitPrice * item.quantity, order.currency)}</td></tr>`).join("");
  return `
  <div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;color:#1a1a1a">
    <h2 style="color:#166534">${escapeHtml(title)}</h2>
    <p>${intro}</p>
    <table style="border-collapse:collapse;width:100%;margin:16px 0" cellpadding="8">
      <tr><td style="border:1px solid #ddd"><strong>Order</strong></td><td style="border:1px solid #ddd">${escapeHtml(order.orderNumber)}</td></tr>
      <tr><td style="border:1px solid #ddd"><strong>Payment</strong></td><td style="border:1px solid #ddd">${escapeHtml(order.paymentStatus)} via ${escapeHtml(order.paymentProvider ?? "manual")}</td></tr>
      ${rows}
      <tr><td style="border:1px solid #ddd"><strong>Total</strong></td><td style="border:1px solid #ddd;text-align:right"><strong>${formatMoney(order.total, order.currency)}</strong></td></tr>
    </table>
    ${adminLink ? `<p><a href="${escapeHtml(adminLink)}">Open order admin</a></p>` : ""}
    <p style="color:#666;font-size:12px">${escapeHtml(siteName)}</p>
  </div>`;
}

async function getSiteName(siteId: number) {
  const [row] = await db.select({ value: settings.value }).from(settings).where(and(eq(settings.siteId, siteId), eq(settings.key, "siteName")));
  return row?.value || "Store";
}

function formatMoney(amount: number, currency: string) {
  return new Intl.NumberFormat("en", { style: "currency", currency: currency.toUpperCase() }).format(amount / 100);
}

// ─── Activity Notifications ──────────────────────────────────────────────────

const ENTITY_LABELS: Record<string, string> = {
  settings: "Settings",
  gallery: "Gallery Image",
  menu_category: "Menu Category",
  menu_item: "Menu Item",
  booking: "Booking",
  message: "Message",
  page: "Page",
  page_block: "Page Block",
  site: "Site",
  user: "User",
  media: "Media",
  navigation: "Navigation Link",
  home_section: "Homepage Section",
};

const ACTION_LABELS: Record<string, string> = {
  create: "Created",
  update: "Updated",
  delete: "Deleted",
  status_change: "Status Changed",
  login: "Logged In",
  logout: "Logged Out",
};

/**
 * Get all super admin emails.
 */
async function getSuperAdminEmails(): Promise<string[]> {
  const admins = await db
    .select({ email: adminUsers.email })
    .from(adminUsers)
    .where(eq(adminUsers.role, "super_admin"));
  return admins.map((a) => a.email);
}

/**
 * Get all tenant admin emails for a given site.
 */
async function getTenantAdminEmails(siteId: number | null): Promise<string[]> {
  if (!siteId) return [];
  const admins = await db
    .select({ email: adminUsers.email })
    .from(adminUsers)
    .where(eq(adminUsers.siteId, siteId));
  return admins.map((a) => a.email);
}

/**
 * Send activity notification email to super admins and tenant admins.
 */
export async function sendActivityNotification(options: {
  siteId: number | null;
  siteName?: string | null;
  userName: string;
  userRole: string;
  action: string;
  entity: string;
  entityId?: number | null;
  entityName?: string | null;
  details?: Record<string, unknown> | null;
}): Promise<void> {
  try {
    const entityLabel = ENTITY_LABELS[options.entity] || options.entity;
    const actionLabel = ACTION_LABELS[options.action] || options.action;

    // Collect recipients: super admins + tenant admins
    const [superAdmins, tenantAdmins] = await Promise.all([
      getSuperAdminEmails(),
      getTenantAdminEmails(options.siteId),
    ]);

    // Deduplicate emails
    const allEmails = [...new Set([...superAdmins, ...tenantAdmins])];
    if (allEmails.length === 0) return;

    const siteInfo = options.siteName ? ` on site "${escapeHtml(options.siteName)}"` : "";
    const entityInfo = options.entityName
      ? `: <strong>${escapeHtml(options.entityName)}</strong>`
      : options.entityId
        ? ` #${options.entityId}`
        : "";

    const html = `
    <div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;color:#1a1a1a">
      <h2 style="color:#166534">Activity Alert${siteInfo}</h2>
      <table style="border-collapse:collapse;width:100%;margin:16px 0" cellpadding="8">
        <tr><td style="border:1px solid #ddd"><strong>Action</strong></td><td style="border:1px solid #ddd">${actionLabel} ${entityLabel}${entityInfo}</td></tr>
        <tr><td style="border:1px solid #ddd"><strong>Performed by</strong></td><td style="border:1px solid #ddd">${escapeHtml(options.userName)} (${escapeHtml(options.userRole)})</td></tr>
        <tr><td style="border:1px solid #ddd"><strong>Time</strong></td><td style="border:1px solid #ddd">${new Date().toLocaleString("en-US", { dateStyle: "full", timeStyle: "short" })}</td></tr>
      </table>
      <p><a href="${process.env.SITE_URL ?? "http://localhost:3000"}/admin/activity">View Activity Log</a></p>
    </div>`;

    const subject = `[Activity] ${actionLabel} ${entityLabel}${options.siteName ? ` — ${options.siteName}` : ""}`;

    // Send to all recipients in parallel
    await Promise.allSettled(
      allEmails.map((email) => sendMail(email, subject, html))
    );
  } catch (err) {
    // Activity notification should never break the main action
    console.error("Failed to send activity notification:", err);
  }
}
