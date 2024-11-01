import { consola } from "consola";
import fs from "fs-extra";
import path from "pathe";

import { DEBUG } from "~/app";

// Function to move the content of src/app to src/app/[locale]
export async function moveAppToLocale(targetDir: string): Promise<void> {
  const appDir = path.join(targetDir, "src", "app");
  const localeDir = path.join(appDir, "[locale]");

  // Check if the app directory exists
  if (await fs.pathExists(appDir)) {
    DEBUG.enableVerboseLogging &&
      consola.info("Moving src/app content to src/app/[locale]...");

    // Ensure the [locale] directory exists
    try {
      await fs.ensureDir(localeDir); // Ensure locale directory
      DEBUG.enableVerboseLogging &&
        consola.success("Created src/app/[locale] directory.");
    } catch (error) {
      consola.error("Failed to create [locale] directory:", error);

      return;
    }

    // Move all files from src/app to src/app/[locale]
    const files = await fs.readdir(appDir);

    for (const file of files) {
      const oldPath = path.join(appDir, file);
      const newPath = path.join(localeDir, file);

      // Skip moving the [locale] folder itself to prevent infinite recursion
      if (file === "[locale]") {
        continue;
      }

      try {
        await fs.move(oldPath, newPath);
        DEBUG.enableVerboseLogging &&
          consola.info(`Moved ${file} to ${newPath}`);
      } catch (error) {
        consola.error(`Error moving ${file} to ${newPath}:`, error);
      }
    }

    DEBUG.enableVerboseLogging &&
      consola.success("Files moved to src/app/[locale] successfully.");
  } else {
    consola.warn("src/app directory not found.");
  }
}
