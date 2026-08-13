import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const root = process.cwd();
const source = (path: string) => readFileSync(join(root, path), "utf8");

test("inventory reservation uses a conditional atomic decrement", () => {
  const inventory = source("lib/commerce/inventory.ts");
  assert.match(inventory, /inventoryQuantity:\s*sql`\$\{products\.inventoryQuantity\} - \$\{item\.quantity\}`/);
  assert.match(inventory, /sql`\$\{products\.inventoryQuantity\} >= \$\{item\.quantity\}`/);
  assert.match(inventory, /if \(updated\.length !== 1\) throw new Error/);
});

test("inventory release is guarded and restores stock exactly once", () => {
  const inventory = source("lib/commerce/inventory.ts");
  assert.match(inventory, /eq\(orders\.inventoryStatus, "reserved"\)/);
  assert.match(inventory, /inventoryStatus: "released"/);
  assert.match(inventory, /status: "cancelled"/);
  assert.match(inventory, /if \(released\.length !== 1\) return false/);
  assert.match(inventory, /inventoryQuantity:\s*sql`\$\{products\.inventoryQuantity\} \+ \$\{item\.quantity\}`/);
});

test("payment providers finalize or release reservations", () => {
  assert.match(source("app/api/payments/stripe/webhook/route.ts"), /commitInventoryReservation/);
  assert.match(source("app/api/payments/stripe/webhook/route.ts"), /checkout\.session\.expired/);
  assert.match(source("app/api/payments/esewa/callback/route.ts"), /commitInventoryReservation/);
  assert.match(source("app/api/payments/esewa/failure/route.ts"), /releaseInventoryReservation/);
  assert.match(source("app/api/crons/cleanup/route.ts"), /releaseExpiredInventoryReservations/);
});
