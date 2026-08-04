import "server-only";

import { createCipheriv, createDecipheriv, randomBytes } from "crypto";

const ALGORITHM = "aes-256-gcm";

function getEncryptionKey() {
  const value = process.env.COMMERCE_SECRETS_KEY;
  if (!value) throw new Error("Set COMMERCE_SECRETS_KEY before saving gateway secrets.");
  const key = Buffer.from(value, "base64");
  if (key.length !== 32) throw new Error("COMMERCE_SECRETS_KEY must be a base64-encoded 32-byte key.");
  return key;
}

export function encryptCommerceSecrets(value: Record<string, string>) {
  const key = getEncryptionKey();
  const iv = randomBytes(12);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(JSON.stringify(value), "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [iv.toString("base64"), tag.toString("base64"), encrypted.toString("base64")].join(".");
}

export function decryptCommerceSecrets(value: string) {
  const [ivValue, tagValue, encryptedValue] = value.split(".");
  if (!ivValue || !tagValue || !encryptedValue) throw new Error("Invalid encrypted payment secret.");
  const decipher = createDecipheriv(ALGORITHM, getEncryptionKey(), Buffer.from(ivValue, "base64"));
  decipher.setAuthTag(Buffer.from(tagValue, "base64"));
  return JSON.parse(Buffer.concat([decipher.update(Buffer.from(encryptedValue, "base64")), decipher.final()]).toString("utf8")) as Record<string, string>;
}
