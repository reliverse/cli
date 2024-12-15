import { defineConfig } from "drizzle-kit";
import os from "os";
import path from "pathe";

const homeDir = os.homedir();
const dbPath = path.join(homeDir, ".reliverse", "reliverse.db");

export default defineConfig({
  out: "./drizzle",
  schema: "./src/db/schema.ts",
  dialect: "sqlite",
  dbCredentials: {
    url: `file:${dbPath}`,
  },
});
 