import { relinka } from "@reliverse/relinka";
import fs from "fs-extra";
import path from "pathe";

import { DEBUG } from "~/app.js";

// Function to move the content of src/app to src/app/[locale]
export async function moveAppToLocale(targetDir: string): Promise<void> {
  const appDir = path.join(targetDir, "src", "app");
  const localeDir = path.join(appDir, "[locale]");

  // Check if the app directory exists
  if (await fs.pathExists(appDir)) {
    DEBUG.enableVerboseLogging &&
      relinka.info("Moving src/app content to src/app/[locale]...");

    // Ensure the [locale] directory exists
    try {
      await fs.ensureDir(localeDir); // Ensure locale directory
      DEBUG.enableVerboseLogging &&
        relinka.success("Created src/app/[locale] directory.");
    } catch (error) {
      relinka.error("Failed to create [locale] directory:", error);

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
          relinka.info(`Moved ${file} to ${newPath}`);
      } catch (error) {
        relinka.error(`Error moving ${file} to ${newPath}:`, error);
      }
    }

    DEBUG.enableVerboseLogging &&
      relinka.success("Files moved to src/app/[locale] successfully.");
  } else {
    relinka.warn("src/app directory not found.");
  }
}
