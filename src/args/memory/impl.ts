import {
  getConfigValue,
  setConfigValue,
  deleteConfigValue,
} from "~/db/config.js";
import { migrateFromFile } from "~/db/migrate.js";

export type ReliverseMemory = {
  user?: {
    name?: string;
    githubName?: string;
    vercelName?: string;
    shouldDeploy?: boolean;
  };
  githubKey?: string | null;
  vercelKey?: string | null;
  code?: string | null;
  key?: string | null;
};

// Track if we've already attempted migration
let migrationAttempted = false;

export async function readReliverseMemory(): Promise<ReliverseMemory> {
  // Attempt migration only once
  if (!migrationAttempted) {
    await migrateFromFile();
    migrationAttempted = true;
  }

  const [githubKey, vercelKey, code, key] = await Promise.all([
    getConfigValue("githubKey"),
    getConfigValue("vercelKey"),
    getConfigValue("code"),
    getConfigValue("key"),
  ]);

  return {
    githubKey,
    vercelKey,
    code,
    key,
  };
}

export async function updateReliverseMemory(
  memory: Partial<ReliverseMemory>,
): Promise<void> {
  const updates: Promise<void>[] = [];

  if (memory.githubKey !== undefined) {
    if (memory.githubKey === null) {
      updates.push(deleteConfigValue("githubKey"));
    } else {
      updates.push(setConfigValue("githubKey", memory.githubKey));
    }
  }

  if (memory.vercelKey !== undefined) {
    if (memory.vercelKey === null) {
      updates.push(deleteConfigValue("vercelKey"));
    } else {
      updates.push(setConfigValue("vercelKey", memory.vercelKey));
    }
  }

  if (memory.code !== undefined) {
    if (memory.code === null) {
      updates.push(deleteConfigValue("code"));
    } else {
      updates.push(setConfigValue("code", memory.code));
    }
  }

  if (memory.key !== undefined) {
    if (memory.key === null) {
      updates.push(deleteConfigValue("key"));
    } else {
      updates.push(setConfigValue("key", memory.key));
    }
  }

  await Promise.all(updates);
}
