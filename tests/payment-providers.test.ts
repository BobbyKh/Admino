import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";
import {
  generateEsewaSignature,
  verifyEsewaSignature,
  isTestPaymentProvider,
  TEST_PAYMENT_PROVIDERS,
} from "../lib/commerce/providers";

const root = process.cwd();

function source(path: string) {
  return readFileSync(join(root, path), "utf8");
}

test("supported payment providers registry includes esewa and stripe", () => {
  assert.ok(isTestPaymentProvider("esewa"));
  assert.ok(isTestPaymentProvider("stripe"));
  assert.ok(isTestPaymentProvider("khalti"));
  assert.ok(isTestPaymentProvider("qr"));
  assert.equal(TEST_PAYMENT_PROVIDERS.length, 4);
});

test("generates and verifies valid eSewa HMAC SHA-256 signature", () => {
  const fields = {
    total_amount: "100.00",
    transaction_uuid: "ORD-12345",
    product_code: "EPAYTEST",
  };
  const signedFields = "total_amount,transaction_uuid,product_code";
  const secretKey = "8gBmBcp$18629$";

  const signature = generateEsewaSignature(fields, signedFields, secretKey);
  assert.ok(typeof signature === "string");
  assert.ok(signature.length > 0);

  const isValid = verifyEsewaSignature(fields, signedFields, signature, secretKey);
  assert.equal(isValid, true);
});

test("rejects modified payload or invalid secret for eSewa signature", () => {
  const fields = {
    total_amount: "100.00",
    transaction_uuid: "ORD-12345",
    product_code: "EPAYTEST",
  };
  const signedFields = "total_amount,transaction_uuid,product_code";
  const secretKey = "8gBmBcp$18629$";

  const signature = generateEsewaSignature(fields, signedFields, secretKey);

  // Alter payload amount
  const tamperedFields = { ...fields, total_amount: "1.00" };
  const isValidTampered = verifyEsewaSignature(tamperedFields, signedFields, signature, secretKey);
  assert.equal(isValidTampered, false);

  // Wrong secret key
  const isValidWrongSecret = verifyEsewaSignature(fields, signedFields, signature, "wrong_secret");
  assert.equal(isValidWrongSecret, false);
});

test("payment credential failures do not crash the admin render", () => {
  const actions = source("lib/actions/commerce.ts");
  const manager = source("components/admin/payment-manager.tsx");
  assert.match(actions, /try \{\s*result\[provider\] = \{ fields: Object\.keys\(decryptCommerceSecrets/);
  assert.match(actions, /unreadable: true/);
  assert.match(manager, /Saved credentials cannot be decrypted/);
});

test("payment configuration and credentials are written atomically", () => {
  const actions = source("lib/actions/commerce.ts");
  assert.match(actions, /preparePaymentSecrets/);
  assert.match(actions, /db\.transaction\(async \(tx\)/);
  assert.match(actions, /Re-enter every secret field or remove this payment method/);
});

test("eSewa routes return controlled errors for unreadable credentials", () => {
  for (const path of [
    "app/api/payments/esewa/initiate/route.ts",
    "app/api/payments/esewa/callback/route.ts",
  ]) {
    const route = source(path);
    assert.match(route, /try \{\s*secrets = decryptCommerceSecrets/);
    assert.match(route, /status: 503/);
  }
});

test("production containers require a stable commerce encryption key", () => {
  assert.match(source("docker-compose.yml"), /COMMERCE_SECRETS_KEY: \$\{COMMERCE_SECRETS_KEY:\?COMMERCE_SECRETS_KEY is required\}/);
  assert.match(source("lib/commerce/secrets.ts"), /Invalid encrypted payment secret payload/);
});
