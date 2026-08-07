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
