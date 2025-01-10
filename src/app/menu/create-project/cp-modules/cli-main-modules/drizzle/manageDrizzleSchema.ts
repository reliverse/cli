import { selectPrompt, confirmPrompt } from "@reliverse/prompts";
import fs from "fs-extra";
import path from "pathe";

import { relinka } from "~/utils/loggerRelinka.js";

import {
  addNewTable,
  removeTable,
  setupDrizzle,
  renameTable,
  manageRelations,
  detectDatabaseProvider,
} from "./manageDrizzleSchemaUtils.js";

export async function manageDrizzleSchema(cwd: string, isDev: boolean) {
  const singleSchemaDir = isDev
    ? path.join(cwd, "src/app/db")
    : path.join(cwd, "src/db");
  const multiSchemaDir = path.join(singleSchemaDir, "schema");

  // Check if Drizzle is configured
  let provider = await detectDatabaseProvider(cwd);
  if (!provider) {
    provider = await setupDrizzle(cwd, isDev);
    if (!provider) {
      relinka("error", "Failed to set up Drizzle.");
      return;
    }
  }

  // Check schema organization preference
  const useMultipleFiles = await confirmPrompt({
    title:
      "Would you like to use multiple files for schema (one file per table)?",
    content:
      "This will organize tables in src/db/schema/* instead of a single schema.ts file",
    defaultValue: false,
  });

  // Create necessary directories
  if (useMultipleFiles) {
    await fs.ensureDir(multiSchemaDir);
  } else {
    await fs.ensureDir(singleSchemaDir);
  }

  // Show schema management options
  const action = await selectPrompt({
    title: "What would you like to do?",
    options: [
      { label: "Add new table", value: "add" },
      { label: "Remove table", value: "remove" },
      { label: "Rename table", value: "rename" },
      { label: "Manage relations", value: "relations" },
    ],
  });

  switch (action) {
    case "add":
      await addNewTable(
        cwd,
        useMultipleFiles,
        provider,
        // singleSchemaDir,
        // multiSchemaDir,
      );
      break;
    case "remove":
      await removeTable(
        cwd,
        useMultipleFiles,
        provider,
        // singleSchemaDir,
        // multiSchemaDir,
      );
      break;
    case "rename":
      await renameTable(
        cwd,
        useMultipleFiles,
        provider,
        // singleSchemaDir,
        // multiSchemaDir,
      );
      break;
    case "relations":
      await manageRelations(
        cwd,
        useMultipleFiles,
        provider,
        // singleSchemaDir,
        // multiSchemaDir,
      );
      break;
  }
}
