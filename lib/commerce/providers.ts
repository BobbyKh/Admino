import { createHmac, timingSafeEqual } from "crypto";

/**
 * Payment provider metadata shared by tenant configuration and checkout.
 */
export const TEST_PAYMENT_PROVIDERS = ["stripe", "khalti", "esewa", "qr"] as const;

export type TestPaymentProvider = (typeof TEST_PAYMENT_PROVIDERS)[number];

export const testPaymentProviderRegistry: Record<
  TestPaymentProvider,
  { label: string; description: string }
> = {
  stripe: {
    label: "Stripe",
    description: "Configure Stripe public identifiers here; keep secret keys in environment variables.",
  },
  khalti: {
    label: "Khalti",
    description: "Configure Khalti public identifiers here; keep secret keys in environment variables.",
  },
  esewa: {
    label: "eSewa",
    description: "Configure eSewa merchant details for test or live payments.",
  },
  qr: {
    label: "QR payment",
    description: "Shows the tenant's QR code and records the customer reference for review.",
  },
};

export function isTestPaymentProvider(value: string): value is TestPaymentProvider {
  return TEST_PAYMENT_PROVIDERS.includes(value as TestPaymentProvider);
}

/**
 * Generates eSewa HMAC-SHA256 signature for payment payload validation.
 */
export function generateEsewaSignature(
  fields: Record<string, string>,
  signedFieldNames: string,
  secretKey: string
): string {
  const message = signedFieldNames
    .split(",")
    .map((field) => `${field}=${fields[field] ?? ""}`)
    .join(",");
  return createHmac("sha256", secretKey).update(message).digest("base64");
}

/**
 * Verifies eSewa HMAC-SHA256 signature timing-safely.
 */
export function verifyEsewaSignature(
  fields: Record<string, string>,
  signedFieldNames: string,
  signature: string,
  secretKey: string
): boolean {
  try {
    const expected = generateEsewaSignature(fields, signedFieldNames, secretKey);
    if (Buffer.byteLength(expected) !== Buffer.byteLength(signature)) {
      return false;
    }
    return timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
  } catch {
    return false;
  }
}
