import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import fs from "fs-extra";
import os from "os";
import path from "pathe";

import { relinka } from "~/utils/console.js";

// Use .reliverse directory in user's home directory
const homeDir = os.homedir();
const reliverseDir = path.join(homeDir, ".reliverse");
const dbPath = path.join(reliverseDir, "reliverse.db");

// Ensure the directory exists
await fs.ensureDir(reliverseDir);

const client = createClient({
  url: `file:${dbPath}`,
});

// Initialize database schema
async function initializeDatabase() {
  try {
    await client.execute(`
      CREATE TABLE IF NOT EXISTS config_keys (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
      );
    `);
  } catch (error) {
    relinka(
      "error",
      "Failed to initialize database:",
      error instanceof Error ? error.message : String(error),
    );
  }
}

// Initialize database on first connection
await initializeDatabase();

export const db = drizzle(client);