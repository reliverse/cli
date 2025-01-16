import { relinka } from "@reliverse/relinka";
import {
  createHash,
  createCipheriv,
  createDecipheriv,
  randomBytes,
} from "crypto";
import { eq } from "drizzle-orm";

import type { EncryptedDataMemory } from "~/utils/schemaMemory.js";

import { db } from "./client.js";
import { configKeysTable } from "./schema.js";

// Encryption key based on machine-specific data
function getDerivedKey(): Buffer {
  const machineId = `${process.platform}-${process.arch}-${process.env["USERNAME"] ?? process.env["USER"]}`;
  return createHash("sha256").update(machineId).digest();
}

export function encrypt(text: string): string {
  try {
    if (text === null || text === undefined) {
      throw new Error("Cannot encrypt null or undefined value");
    }

    // Convert to string explicitly in case we get a non-string value
    const textToEncrypt = String(text);

    const iv = randomBytes(16);
    const key = getDerivedKey();
    const cipher = createCipheriv("aes-256-cbc", key, iv);
    const textBuffer = Buffer.from(textToEncrypt, "utf8");
    const encrypted = Buffer.concat([
      cipher.update(textBuffer),
      cipher.final(),
    ]);
    return `${iv.toString("hex")}:${encrypted.toString("hex")}`;
  } catch (error) {
    relinka(
      "error",
      "Error encrypting value:",
      `${error instanceof Error ? error.message : String(error)} (type: ${typeof text}, value: ${text})`,
    );
    throw error;
  }
}

export function decrypt(text: string): string {
  try {
    const [ivHex, encryptedHex] = text.split(":");
    if (!ivHex || !encryptedHex) {
      throw new Error("Invalid encrypted text format");
    }
    const iv = Buffer.from(ivHex, "hex");
    const encrypted = Buffer.from(encryptedHex, "hex");
    const key = getDerivedKey();
    const decipher = createDecipheriv("aes-256-cbc", key, iv);
    const decrypted = Buffer.concat([
      decipher.update(encrypted),
      decipher.final(),
    ]);
    return decrypted.toString();
  } catch (error) {
    relinka(
      "error",
      "Error decrypting value:",
      error instanceof Error ? error.message : String(error),
    );
    throw error;
  }
}

export async function getConfigValue(
  key: EncryptedDataMemory,
): Promise<string | null> {
  try {
    const result = await db
      .select()
      .from(configKeysTable)
      .where(eq(configKeysTable.key, key));

    if (!result[0]?.value) {
      return null;
    }

    try {
      return decrypt(result[0].value);
    } catch {
      // If decryption fails, delete the corrupted value and return null
      await deleteMemoryValue(key);
      return null;
    }
  } catch (error) {
    relinka(
      "error",
      `Error getting config value for ${key}:`,
      error instanceof Error ? error.message : String(error),
    );
    return null;
  }
}

export async function setConfigValue(
  key: EncryptedDataMemory,
  value: string,
): Promise<void> {
  try {
    const encryptedValue = encrypt(value);
    await db
      .insert(configKeysTable)
      .values({
        key,
        value: encryptedValue,
      })
      .onConflictDoUpdate({
        target: configKeysTable.key,
        set: {
          value: encryptedValue,
        },
      });
  } catch (error) {
    relinka(
      "error",
      `Error setting config value for ${key}:`,
      error instanceof Error ? error.message : String(error),
    );
    throw error;
  }
}

export async function deleteMemoryValue(
  key: EncryptedDataMemory,
): Promise<void> {
  try {
    await db.delete(configKeysTable).where(eq(configKeysTable.key, key));
  } catch (error) {
    relinka(
      "error",
      `Error deleting config value for ${key}:`,
      error instanceof Error ? error.message : String(error),
    );
    throw error;
  }
}
