"use server";

import { z } from "zod";
import { db } from "@/lib/db";
import { messages } from "@/lib/db/schema";
import { escapeHtml } from "@/lib/sanitize";
import { sendContactAdminAlert } from "@/lib/email";
import { checkRateLimit } from "@/lib/rate-limit";
import { dispatchWebhook } from "@/lib/webhooks";

const formSubmissionSchema = z.object({
  siteId: z.number().int().positive(),
  name: z.string().trim().min(1, "Name is required.").max(120),
  email: z.string().trim().email("Invalid email address.").max(160),
  phone: z.string().trim().max(40).optional(),
  subject: z.string().trim().min(1, "Subject is required.").max(200),
  message: z.string().trim().min(1, "Message is required.").max(2000),
});

export type FormSubmissionState = {
  success?: boolean;
  message?: string;
  fieldErrors?: Record<string, string>;
};

/**
 * Handles custom site form submissions with validation, rate-limiting, and admin notification.
 */
export async function submitSiteForm(
  _prev: FormSubmissionState,
  formData: FormData
): Promise<FormSubmissionState> {
  const siteId = Number(formData.get("siteId") ?? 0);
  const name = String(formData.get("name") ?? "");
  const email = String(formData.get("email") ?? "");
  const phone = String(formData.get("phone") ?? "");
  const subject = String(formData.get("subject") ?? "Website Inquiry");
  const messageText = String(formData.get("message") ?? "");

  const parsed = formSubmissionSchema.safeParse({ siteId, name, email, phone, subject, message: messageText });
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      if (issue.path[0]) fieldErrors[issue.path[0].toString()] = issue.message;
    }
    return { success: false, message: "Please fix the validation errors.", fieldErrors };
  }

  const rateCheck = await checkRateLimit(`form:${parsed.data.siteId}:${parsed.data.email}`);
  if (!rateCheck.allowed) {
    return { success: false, message: "Too many submissions. Please try again in a few minutes." };
  }

  const sanitized = {
    siteId: parsed.data.siteId,
    name: escapeHtml(parsed.data.name),
    email: parsed.data.email,
    phone: parsed.data.phone ? escapeHtml(parsed.data.phone) : null,
    subject: escapeHtml(parsed.data.subject),
    message: escapeHtml(parsed.data.message),
    createdAt: new Date().toISOString(),
  };

  await db.insert(messages).values(sanitized);

  // Trigger optional email alert safely
  void sendContactAdminAlert(sanitized).catch((err) =>
    console.error("Failed to send contact notification alert:", err)
  );

  // Dispatch webhook
  void dispatchWebhook(parsed.data.siteId, "message.received", {
    message: {
      name: sanitized.name,
      email: sanitized.email,
      phone: sanitized.phone,
      subject: sanitized.subject,
      message: sanitized.message,
    },
  }).catch((err) => console.error("Webhook dispatch failed:", err));

  return { success: true, message: "Thank you! Your message has been submitted successfully." };
}
