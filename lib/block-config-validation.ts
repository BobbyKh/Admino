import { getBlockType, getDefaultConfig } from "@/lib/blocks";

const MAX_CONFIG_LENGTH = 25_000;
const MAX_STRING_LENGTH = 5_000;
const MAX_ARRAY_LENGTH = 80;
const MAX_DEPTH = 6;
const BLOCKED_KEYS = new Set(["__proto__", "constructor", "prototype"]);

type JsonObject = Record<string, unknown>;

export function validateBlockType(type: string) {
  if (!getBlockType(type)) {
    throw new Error("Unsupported block type.");
  }
}

export function validateBlockConfig(type: string, rawConfig: string | null): string | null {
  validateBlockType(type);
  if (!rawConfig?.trim()) return null;
  if (rawConfig.length > MAX_CONFIG_LENGTH) {
    throw new Error("Block config is too large.");
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(rawConfig);
  } catch {
    throw new Error("Block config must be valid JSON.");
  }

  if (!isPlainObject(parsed)) {
    throw new Error("Block config must be a JSON object.");
  }

  assertSafeJson(parsed, 0);
  assertKnownFieldTypes(type, parsed);
  return JSON.stringify(parsed);
}

function assertKnownFieldTypes(type: string, value: JsonObject) {
  const defaults = getDefaultConfig(type);
  for (const [key, current] of Object.entries(value)) {
    const expected = defaults[key];
    if (expected === undefined || current === null || current === undefined) continue;
    if (!matchesDefaultType(current, expected)) {
      throw new Error(`Invalid value for block field "${key}".`);
    }
  }
}

function matchesDefaultType(value: unknown, expected: unknown): boolean {
  if (Array.isArray(expected)) return Array.isArray(value);
  if (isPlainObject(expected)) return isPlainObject(value);
  if (typeof expected === "boolean") return typeof value === "boolean" || value === "true" || value === "false";
  if (typeof expected === "number") return typeof value === "number" || (typeof value === "string" && value.trim() !== "" && !Number.isNaN(Number(value)));
  if (typeof expected === "string") return typeof value === "string";
  return true;
}

function assertSafeJson(value: unknown, depth: number) {
  if (depth > MAX_DEPTH) throw new Error("Block config is nested too deeply.");
  if (typeof value === "string" && value.length > MAX_STRING_LENGTH) throw new Error("Block config contains text that is too long.");
  if (typeof value === "number" && !Number.isFinite(value)) throw new Error("Block config contains an invalid number.");
  if (Array.isArray(value)) {
    if (value.length > MAX_ARRAY_LENGTH) throw new Error("Block config contains too many items.");
    for (const item of value) assertSafeJson(item, depth + 1);
    return;
  }
  if (isPlainObject(value)) {
    for (const [key, child] of Object.entries(value)) {
      if (BLOCKED_KEYS.has(key)) throw new Error("Block config contains an unsafe key.");
      if (key.length > 80) throw new Error("Block config contains a key that is too long.");
      assertSafeJson(child, depth + 1);
    }
  }
}

function isPlainObject(value: unknown): value is JsonObject {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
