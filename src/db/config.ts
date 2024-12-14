import {
  createHash,
  createCipheriv,
  createDecipheriv,
  randomBytes,
} from "crypto";
import { eq } from "drizzle-orm";

import { relinka } from "~/utils/console.js";

import { db } from "./client.js";
import { configKeysTable } from "./schema.js";

export type ConfigKey = "githubKey" | "vercelKey" | "code" | "key";

// Use a consistent encryption key based on machine-specific data
function getDerivedKey(): Buffer {
  const machineId = `${process.platform}-${process.arch}-${process.env.USERNAME || process.env.USER}`;
  return createHash("sha256").update(machineId).digest();
}

function encrypt(text: string): string {
  try {
    const iv = randomBytes(16);
    const key = getDerivedKey();
    const cipher = createCipheriv("aes-256-cbc", key, iv);
    const encrypted = Buffer.concat([cipher.update(text), cipher.final()]);
    return `${iv.toString("hex")}:${encrypted.toString("hex")}`;
  } catch (error) {
    relinka(
      "error",
      "Error encrypting value:",
      error instanceof Error ? error.message : String(error),
    );
    throw error;
  }
}

function decrypt(text: string): string {
  try {
    const [ivHex, encryptedHex] = text.split(":");
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

export async function getConfigValue(key: ConfigKey): Promise<string | null> {
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
      await deleteConfigValue(key);
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
  key: ConfigKey,
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

export async function deleteConfigValue(key: ConfigKey): Promise<void> {
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
