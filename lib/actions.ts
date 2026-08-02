"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { bookings, messages } from "@/lib/db/schema";
import {
  sendBookingAdminAlert,
  sendBookingConfirmation,
  sendContactAdminAlert,
} from "@/lib/email";
import { requireAdmin } from "@/lib/auth";
import type { Booking } from "@/lib/db/schema";
import { getResolvedSiteId } from "@/lib/site-context";

const bookingSchema = z.object({
  name: z.string().trim().min(2, "Please enter your name").max(100),
  email: z.string().trim().email("Please enter a valid email"),
  phone: z.string().trim().min(7, "Please enter a valid phone number").max(30),
  date: z
    .string()
    .trim()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Please pick a date")
    .refine((d) => !Number.isNaN(new Date(`${d}T12:00`).getTime()), "Invalid date"),
  time: z.string().trim().regex(/^\d{2}:\d{2}$/, "Please pick a time"),
  guests: z.coerce.number().int().min(1).max(200),
  occasion: z.string().trim().max(100).optional().default(""),
  notes: z.string().trim().max(1000).optional().default(""),
});

export type BookingFormState = {
  success?: boolean;
  errors?: Record<string, string[]>;
  message?: string;
};

export async function createBooking(
  _prevState: BookingFormState,
  formData: FormData
): Promise<BookingFormState> {
  const parsed = bookingSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    phone: formData.get("phone"),
    date: formData.get("date"),
    time: formData.get("time"),
    guests: formData.get("guests"),
    occasion: formData.get("occasion") || "",
    notes: formData.get("notes") || "",
  });

  if (!parsed.success) {
    return {
      errors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    };
  }

  const data = parsed.data;
  const bookingAt = new Date(`${data.date}T${data.time || "12:00"}`);
  if (bookingAt < new Date()) {
    return {
      errors: { date: ["Please choose a date in the future."] },
    };
  }

  const siteId = await getResolvedSiteId();

  const [booking] = await db
    .insert(bookings)
    .values({
      siteId,
      name: data.name,
      email: data.email,
      phone: data.phone,
      date: data.date,
      time: data.time,
      guests: data.guests,
      occasion: data.occasion || null,
      notes: data.notes || null,
      status: "pending",
    })
    .returning();

  // Fire-and-forget emails (best effort; graceful when SMTP unconfigured).
  if (booking) {
    void sendBookingConfirmation(booking as Booking).catch(() => {});
    void sendBookingAdminAlert(booking as Booking).catch(() => {});
  }

  return {
    success: true,
    message: "Booking received! A confirmation email is on its way.",
  };
}

const contactSchema = z.object({
  name: z.string().trim().min(2).max(100),
  email: z.string().trim().email(),
  phone: z.string().trim().max(30).optional().default(""),
  subject: z.string().trim().min(2).max(200),
  message: z.string().trim().min(10).max(5000),
});

export type ContactFormState = {
  success?: boolean;
  errors?: Record<string, string[]>;
  message?: string;
};

export async function submitContact(
  _prevState: ContactFormState,
  formData: FormData
): Promise<ContactFormState> {
  const parsed = contactSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    phone: formData.get("phone") || "",
    subject: formData.get("subject"),
    message: formData.get("message"),
  });

  if (!parsed.success) {
    return {
      errors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    };
  }

  const data = parsed.data;
  const siteId = await getResolvedSiteId();
  const [msg] = await db
    .insert(messages)
    .values({
      siteId,
      name: data.name,
      email: data.email,
      phone: data.phone || null,
      subject: data.subject,
      message: data.message,
    })
    .returning();

  if (msg) {
    void sendContactAdminAlert(msg).catch(() => {});
  }

  return {
    success: true,
    message: "Message sent! We'll get back to you soon.",
  };
}

// ---------------------------------------------------------------- admin

export async function adminLogout() {
  const { destroySession } = await import("@/lib/auth");
  await destroySession();
  redirect("/admin/login");
}

export async function updateBookingStatus(
  bookingId: number,
  formData: FormData
) {
  await requireAdmin();
  const status = String(formData.get("status") ?? "");
  const valid = ["pending", "confirmed", "cancelled", "completed"];
  if (!valid.includes(status)) throw new Error("Invalid status");

  const [updated] = await db
    .update(bookings)
    .set({ status })
    .where(eq(bookings.id, bookingId))
    .returning();

  if (updated && status !== "pending") {
    const { sendBookingStatusEmail } = await import("@/lib/email");
    void sendBookingStatusEmail(updated as Booking, status).catch(() => {});
  }

  revalidatePath("/admin/bookings");
}

export async function deleteBooking(bookingId: number) {
  await requireAdmin();
  await db.delete(bookings).where(eq(bookings.id, bookingId));
  revalidatePath("/admin/bookings");
}

export async function toggleMessageRead(messageId: number, read: boolean) {
  await requireAdmin();
  await db.update(messages).set({ read }).where(eq(messages.id, messageId));
  revalidatePath("/admin/messages");
}

export async function deleteMessage(messageId: number) {
  await requireAdmin();
  await db.delete(messages).where(eq(messages.id, messageId));
  revalidatePath("/admin/messages");
}
