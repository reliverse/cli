import fs from "fs-extra";
import os from "os";
import path from "pathe";

import { MEMORY_FILE } from "~/app/data/constants.js";
import { db } from "~/db/client.js";
import { encrypt, decrypt, type ConfigKey } from "~/db/config.js";
import {
  configKeysTable,
  userDataTable,
  type UserDataKeys,
} from "~/db/schema.js";
import { relinka } from "~/utils/console.js";

import type { Memory } from "./types.js";

const homeDir = os.homedir();
const dbPath = path.join(homeDir, MEMORY_FILE);

// Ensure directory exists
await fs.ensureDir(path.dirname(dbPath));

export async function readReliverseMemory(): Promise<Memory> {
  try {
    // Read encrypted data from config_keys
    const configRows = await db.select().from(configKeysTable);
    const configData = configRows.reduce<Record<string, string>>((acc, row) => {
      try {
        acc[row.key] = decrypt(row.value);
      } catch {
        acc[row.key] = "missing";
      }
      return acc;
    }, {});

    // Read non-encrypted data from user_data
    const userRows = await db.select().from(userDataTable);
    const userData = userRows.reduce<Record<string, string>>((acc, row) => {
      acc[row.key] = row.value;
      return acc;
    }, {});

    return {
      // Encrypted data
      code: configData.code || "missing",
      key: configData.key || "missing",
      githubKey: configData.githubKey || "missing",
      vercelKey: configData.vercelKey || "missing",
      // Non-encrypted data
      name: userData.name || "missing",
      email: userData.email || "missing",
      githubUsername: userData.githubUsername || "missing",
      vercelUsername: userData.vercelUsername || "missing",
    };
  } catch (error) {
    relinka("error", "Error reading memory:", error.toString());
    return {
      code: "missing",
      key: "missing",
      githubKey: "missing",
      vercelKey: "missing",
      name: "missing",
      email: "missing",
      githubUsername: "missing",
      vercelUsername: "missing",
    };
  }
}

export async function updateReliverseMemory(
  data: Partial<Memory>,
): Promise<void> {
  try {
    // Split updates into encrypted and non-encrypted data
    const configUpdates = Object.entries(data)
      .filter(([key]) =>
        ["code", "key", "githubKey", "vercelKey"].includes(key),
      )
      .map(([key, value]) => ({
        key: key as ConfigKey,
        value: encrypt(value),
      }));

    const userDataUpdates = Object.entries(data)
      .filter(([key]) =>
        ["name", "email", "githubUsername", "vercelUsername"].includes(key),
      )
      .map(([key, value]) => ({
        key: key as UserDataKeys,
        value: value,
      }));

    // Update encrypted data in config_keys
    for (const update of configUpdates) {
      await db
        .insert(configKeysTable)
        .values(update)
        .onConflictDoUpdate({
          target: configKeysTable.key,
          set: { value: update.value },
        });
    }

    // Update non-encrypted data in user_data
    for (const update of userDataUpdates) {
      await db
        .insert(userDataTable)
        .values(update)
        .onConflictDoUpdate({
          target: userDataTable.key,
          set: { value: update.value },
        });
    }

    relinka("success-verbose", "Memory updated successfully");
  } catch (error) {
    relinka("error", "Error updating memory:", error.toString());
    throw error;
  }
}
