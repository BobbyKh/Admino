import assert from "node:assert/strict";
import test from "node:test";
import { getQuantityUnitPrice, parseWholesaleTiers } from "../lib/commerce/pricing";

const tiers = JSON.stringify([
  { minQuantity: 10, unitPrice: 2200 },
  { minQuantity: 50, unitPrice: 1900 },
  { minQuantity: 100, unitPrice: 1700 },
]);

test("wholesale pricing applies the highest reached quantity tier", () => {
  assert.equal(getQuantityUnitPrice(2500, tiers, 1), 2500);
  assert.equal(getQuantityUnitPrice(2500, tiers, 10), 2200);
  assert.equal(getQuantityUnitPrice(2500, tiers, 49), 2200);
  assert.equal(getQuantityUnitPrice(2500, tiers, 100), 1700);
});

test("invalid wholesale tier data safely falls back to retail pricing", () => {
  assert.deepEqual(parseWholesaleTiers("not-json"), []);
  assert.equal(getQuantityUnitPrice(2500, "not-json", 100), 2500);
});
