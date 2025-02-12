import { defineConfig } from "drizzle-kit";

import { memoryPath } from "./src/app/constants.js";

export default defineConfig({
  out: "./drizzle",
  dialect: "sqlite",
  schema: "./src/app/db/schema.ts",
  dbCredentials: { url: `file:${memoryPath}` },
});
