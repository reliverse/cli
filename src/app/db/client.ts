import { createClient } from "@libsql/client/node";
import { relinka } from "@reliverse/relinka";
import { drizzle } from "drizzle-orm/libsql/node";
import fs from "fs-extra";
import os from "os";
import path from "pathe";

// Use .reliverse directory in user's home directory
const homeDir = os.homedir();
const reliverseDir = path.join(homeDir, ".reliverse");
const dbPath = path.join(reliverseDir, "reliverse.db");

// Ensure the directory exists
await fs.ensureDir(reliverseDir);

const client = createClient({
  url: `file:${dbPath}`,
});

const db = drizzle(client);

// Initialize database schema
async function initializeDatabase() {
  try {
    await client.batch([
      `CREATE TABLE IF NOT EXISTS config_keys (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
      )`,
      `CREATE TABLE IF NOT EXISTS user_data (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
      )`,
    ]);
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

export { db };
