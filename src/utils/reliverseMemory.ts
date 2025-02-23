import { relinka } from "@reliverse/prompts";
import { Value } from "@sinclair/typebox/value";
import { eq } from "drizzle-orm";
import fs from "fs-extra";
import path from "pathe";

import { memoryPath } from "~/app/constants.js";
import { db } from "~/app/db/client.js";
import { encrypt, decrypt } from "~/app/db/config.js";
import { configKeysTable, userDataTable } from "~/app/db/schema.js";

import type {
  EncryptedDataMemory,
  ReliverseMemory,
  UserDataMemory,
} from "./schemaMemory.js";

import { memorySchema } from "./schemaMemory.js";

export async function reReadReliverseMemory(): Promise<ReliverseMemory | null> {
  try {
    // Read encrypted data from config_keys
    const configRows = await db.select().from(configKeysTable);
    const configData = configRows.reduce<Record<string, string>>((acc, row) => {
      try {
        const decrypted = decrypt(row.value);
        // Try to parse JSON if the value looks like JSON
        try {
          if (decrypted.startsWith("{") ?? decrypted.startsWith("[")) {
            acc[row.key] = JSON.parse(decrypted) as string;
          } else {
            acc[row.key] = decrypted;
          }
        } catch {
          acc[row.key] = decrypted;
        }
      } catch {
        acc[row.key] = "";
      }
      return acc;
    }, {});

    // Read non-encrypted data from user_data
    const userRows = await db.select().from(userDataTable);
    const userData = userRows.reduce<Record<string, string>>((acc, row) => {
      try {
        // Try to parse JSON if the value looks like JSON
        if (row.value.startsWith("{") ?? row.value.startsWith("[")) {
          acc[row.key] = JSON.parse(row.value) as string;
        } else {
          acc[row.key] = row.value;
        }
      } catch {
        acc[row.key] = row.value;
      }
      return acc;
    }, {});

    const memory: ReliverseMemory = {
      // Encrypted data
      code: configData["code"] ?? "",
      key: configData["key"] ?? "",
      githubKey: configData["githubKey"] ?? "",
      vercelKey: configData["vercelKey"] ?? "",
      openaiKey: configData["openaiKey"] ?? "",
      // Non-encrypted data
      name: userData["name"] ?? "",
      email: userData["email"] ?? "",
      githubUsername: userData["githubUsername"] ?? "",
      vercelUsername: userData["vercelUsername"] ?? "",
      vercelTeamId: userData["vercelTeamId"] ?? "",
    };

    // Validate against schema
    if (Value.Check(memorySchema, memory)) {
      return memory;
    }

    // If invalid, log the errors
    const errors = [...Value.Errors(memorySchema, memory)].map(
      (err) => `Path "${err.path}": ${err.message}`,
    );
    relinka("warn", "Invalid memory schema:", errors.join("; "));
    return null;
  } catch (error) {
    relinka(
      "error",
      "Failed to read memory from database:",
      error instanceof Error ? error.message : String(error),
    );
    return null;
  }
}

export async function getReliverseMemory(): Promise<ReliverseMemory> {
  // Ensure directory exists
  if (!(await fs.pathExists(path.dirname(memoryPath)))) {
    await fs.ensureDir(path.dirname(memoryPath));
  }

  try {
    // Read encrypted data from config_keys
    const configRows = await db.select().from(configKeysTable);
    const configData = configRows.reduce<Record<string, string>>((acc, row) => {
      try {
        const decrypted = decrypt(row.value);
        // Try to parse JSON if the value looks like JSON
        try {
          if (decrypted.startsWith("{") ?? decrypted.startsWith("[")) {
            acc[row.key] = JSON.parse(decrypted) as string;
          } else {
            acc[row.key] = decrypted;
          }
        } catch {
          acc[row.key] = decrypted;
        }
      } catch {
        acc[row.key] = "";
      }
      return acc;
    }, {});

    // Read non-encrypted data from user_data
    const userRows = await db.select().from(userDataTable);
    const userData = userRows.reduce<Record<string, string>>((acc, row) => {
      try {
        // Try to parse JSON if the value looks like JSON
        if (row.value.startsWith("{") ?? row.value.startsWith("[")) {
          acc[row.key] = JSON.parse(row.value) as string;
        } else {
          acc[row.key] = row.value;
        }
      } catch {
        acc[row.key] = row.value;
      }
      return acc;
    }, {});

    return {
      // Encrypted data
      code: configData["code"] ?? "",
      key: configData["key"] ?? "",
      githubKey: configData["githubKey"] ?? "",
      vercelKey: configData["vercelKey"] ?? "",
      openaiKey: configData["openaiKey"] ?? "",
      // Non-encrypted data
      name: userData["name"] ?? "",
      email: userData["email"] ?? "",
      githubUsername: userData["githubUsername"] ?? "",
      vercelUsername: userData["vercelUsername"] ?? "",
      vercelTeamId: userData["vercelTeamId"] ?? "",
    };
  } catch (error) {
    relinka(
      "error",
      "Error reading memory:",
      error instanceof Error ? error.message : String(error),
    );
    return {
      code: "",
      key: "",
      githubKey: "",
      vercelKey: "",
      openaiKey: "",
      name: "",
      email: "",
      githubUsername: "",
      vercelUsername: "",
      vercelTeamId: "",
    };
  }
}

export async function updateReliverseMemory(
  data: Partial<ReliverseMemory>,
): Promise<void> {
  try {
    // Split updates into encrypted and non-encrypted data
    const configUpdates = Object.entries(data)
      .filter(([key]) =>
        ["code", "key", "githubKey", "vercelKey", "openaiKey"].includes(key),
      )
      .filter(([_, value]) => value !== null && value !== undefined)
      .map(([key, value]) => ({
        key: key as EncryptedDataMemory,
        value: encrypt(
          typeof value === "object"
            ? JSON.stringify(value)
            : typeof value === "undefined"
              ? ""
              : String(value),
        ),
      }));

    const userDataUpdates = Object.entries(data)
      .filter(([key]) =>
        [
          "name",
          "email",
          "githubUsername",
          "vercelUsername",
          "vercelTeamId",
        ].includes(key),
      )
      .filter(([_, value]) => value !== null && value !== undefined)
      .map(([key, value]) => ({
        key: key as UserDataMemory,
        value:
          typeof value === "object"
            ? JSON.stringify(value)
            : typeof value === "undefined"
              ? ""
              : String(value),
      }));

    // Delete entries that are explicitly set to null
    const keysToDelete = Object.entries(data)
      .filter(([key]) =>
        ["code", "key", "githubKey", "vercelKey", "openaiKey"].includes(key),
      )
      .filter(([_, value]) => value === null)
      .map(([key]) => key as EncryptedDataMemory);

    // Delete null entries from config_keys
    for (const key of keysToDelete) {
      await db.delete(configKeysTable).where(eq(configKeysTable.key, key));
    }

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
    relinka(
      "error",
      "Error updating memory:",
      error instanceof Error ? error.message : String(error),
    );
    throw error;
  }
}
