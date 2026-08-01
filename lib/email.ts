import "server-only";

import { cache } from "react";
import nodemailer from "nodemailer";
import type { Booking } from "@/lib/db/schema";
import { formatBookingDate } from "@/lib/format";
import { getSettingsRows } from "@/lib/settings-admin";

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
      "no-reply@maitiresort.com",
    notifyTo:
      rows.adminNotifyEmail ||
      process.env.ADMIN_NOTIFY_EMAIL ||
      user ||
      "admin@maitiresort.com",
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
  const html = `
  <div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;color:#1a1a1a">
    <h2 style="color:#166534">Booking Received — Maiti Resort</h2>
    <p>Dear <strong>${booking.name}</strong>,</p>
    <p>Thank you for choosing Maiti Resort! Your booking request has been received and we will confirm it shortly.</p>
    <table style="border-collapse:collapse;width:100%;margin:16px 0" cellpadding="8">
      <tr><td style="border:1px solid #ddd"><strong>Date &amp; Time</strong></td><td style="border:1px solid #ddd">${when}</td></tr>
      <tr><td style="border:1px solid #ddd"><strong>Guests</strong></td><td style="border:1px solid #ddd">${booking.guests}</td></tr>
      ${booking.occasion ? `<tr><td style="border:1px solid #ddd"><strong>Occasion</strong></td><td style="border:1px solid #ddd">${booking.occasion}</td></tr>` : ""}
      ${booking.notes ? `<tr><td style="border:1px solid #ddd"><strong>Special requests</strong></td><td style="border:1px solid #ddd">${booking.notes}</td></tr>` : ""}
      <tr><td style="border:1px solid #ddd"><strong>Booking ID</strong></td><td style="border:1px solid #ddd">#${booking.id}</td></tr>
    </table>
    <p>Maiti Resort · Kirtipur 44600, Nepal · +977 974-6510970</p>
    <p style="color:#666;font-size:12px">Open daily 10:00 AM – 10:00 PM</p>
  </div>`;
  return sendMail(booking.email, "Booking received — Maiti Resort", html);
}

export async function sendBookingAdminAlert(booking: Booking) {
  const when = formatBookingDate(booking.date, booking.time);
  const html = `
  <div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;color:#1a1a1a">
    <h2 style="color:#166534">New Booking Request #${booking.id}</h2>
    <table style="border-collapse:collapse;width:100%;margin:16px 0" cellpadding="8">
      <tr><td style="border:1px solid #ddd"><strong>Name</strong></td><td style="border:1px solid #ddd">${booking.name}</td></tr>
      <tr><td style="border:1px solid #ddd"><strong>Email</strong></td><td style="border:1px solid #ddd">${booking.email}</td></tr>
      <tr><td style="border:1px solid #ddd"><strong>Phone</strong></td><td style="border:1px solid #ddd">${booking.phone}</td></tr>
      <tr><td style="border:1px solid #ddd"><strong>Date &amp; Time</strong></td><td style="border:1px solid #ddd">${when}</td></tr>
      <tr><td style="border:1px solid #ddd"><strong>Guests</strong></td><td style="border:1px solid #ddd">${booking.guests}</td></tr>
      ${booking.occasion ? `<tr><td style="border:1px solid #ddd"><strong>Occasion</strong></td><td style="border:1px solid #ddd">${booking.occasion}</td></tr>` : ""}
    </table>
    <p><a href="${process.env.SITE_URL ?? "http://localhost:3000"}/admin/bookings">Open admin panel</a></p>
  </div>`;
  const { notifyTo } = await getSmtpConfig();
  return sendMail(notifyTo, `New booking request #${booking.id} — Maiti Resort`, html);
}

export async function sendBookingStatusEmail(booking: Booking, status: string) {
  const when = formatBookingDate(booking.date, booking.time);
  const message =
    status === "confirmed"
      ? "Great news — your table has been <strong>confirmed</strong>! We look forward to hosting you."
      : status === "cancelled"
        ? "Unfortunately your booking has been <strong>cancelled</strong>. Please contact us if this is in error."
        : status === "completed"
          ? "Thank you for visiting Maiti Resort! We hope you had a wonderful time."
          : "Your booking is currently pending confirmation.";
  const html = `
  <div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;color:#1a1a1a">
    <h2 style="color:#166534">Booking Update — Maiti Resort</h2>
    <p>Dear <strong>${booking.name}</strong>,</p>
    <p>${message}</p>
    <table style="border-collapse:collapse;width:100%;margin:16px 0" cellpadding="8">
      <tr><td style="border:1px solid #ddd"><strong>Date &amp; Time</strong></td><td style="border:1px solid #ddd">${when}</td></tr>
      <tr><td style="border:1px solid #ddd"><strong>Guests</strong></td><td style="border:1px solid #ddd">${booking.guests}</td></tr>
      <tr><td style="border:1px solid #ddd"><strong>Booking ID</strong></td><td style="border:1px solid #ddd">#${booking.id}</td></tr>
    </table>
    <p>Maiti Resort · Kirtipur 44600, Nepal · +977 974-6510970</p>
  </div>`;
  return sendMail(booking.email, `Booking ${status} — Maiti Resort`, html);
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
      <tr><td style="border:1px solid #ddd"><strong>Name</strong></td><td style="border:1px solid #ddd">${message.name}</td></tr>
      <tr><td style="border:1px solid #ddd"><strong>Email</strong></td><td style="border:1px solid #ddd">${message.email}</td></tr>
      ${message.phone ? `<tr><td style="border:1px solid #ddd"><strong>Phone</strong></td><td style="border:1px solid #ddd">${message.phone}</td></tr>` : ""}
      <tr><td style="border:1px solid #ddd"><strong>Subject</strong></td><td style="border:1px solid #ddd">${message.subject}</td></tr>
      <tr><td style="border:1px solid #ddd" colspan="2"><strong>Message</strong><br/>${message.message.replace(/\n/g, "<br/>")}</td></tr>
    </table>
    <p><a href="${process.env.SITE_URL ?? "http://localhost:3000"}/admin/messages">Open admin panel</a></p>
  </div>`;
  const { notifyTo } = await getSmtpConfig();
  return sendMail(notifyTo, `New contact message: ${message.subject}`, html);
}
