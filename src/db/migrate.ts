import fs from "fs-extra";
import os from "os";
import path from "pathe";

import { relinka } from "~/utils/console.js";

import { setConfigValue } from "./config.js";

type OldMemoryFileData = {
  githubKey?: string | null;
  vercelKey?: string | null;
  [key: string]: unknown;
};

export async function migrateFromFile(): Promise<void> {
  const homeDir = os.homedir();
  const oldDirPath = path.join(homeDir, ".reliverse");
  const oldFilePath = path.join(oldDirPath, ".reliverse");

  try {
    // Check if old file exists in the .reliverse directory
    if (await fs.pathExists(oldFilePath)) {
      relinka("info", "Found old config file, migrating data...");

      // Read old file
      const fileContent = await fs.readFile(oldFilePath, "utf8");
      const oldData = JSON.parse(fileContent) as OldMemoryFileData;

      // Migrate keys
      const migrations: Promise<void>[] = [];

      if (oldData.githubKey) {
        migrations.push(setConfigValue("githubKey", oldData.githubKey));
      }

      if (oldData.vercelKey) {
        migrations.push(setConfigValue("vercelKey", oldData.vercelKey));
      }

      await Promise.all(migrations);

      // Backup old file
      const backupPath = path.join(oldDirPath, ".reliverse.backup");
      await fs.move(oldFilePath, backupPath, { overwrite: true });

      relinka("success", "Successfully migrated data from config file");
      relinka("info", `Old file backed up to ${backupPath}`);
    }
  } catch (error) {
    relinka(
      "error",
      "Error migrating from old file:",
      error instanceof Error ? error.message : String(error),
    );
    // Don't throw - allow the application to continue even if migration fails
  }
}
