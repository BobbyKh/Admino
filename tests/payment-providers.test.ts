import assert from "node:assert/strict";
import { test } from "node:test";
import {
  generateEsewaSignature,
  verifyEsewaSignature,
  isTestPaymentProvider,
  TEST_PAYMENT_PROVIDERS,
} from "../lib/commerce/providers";

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
