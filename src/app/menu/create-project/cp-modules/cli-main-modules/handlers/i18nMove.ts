import fs from "fs-extra";
import path from "pathe";

import { relinka } from "~/utils/loggerRelinka.js";

// Paths that should be ignored when moving files to [locale]
const IGNORED_PATHS = ["api"];

// Function to move content between src/app and src/app/[locale]
export async function i18nMove(
  projectPath: string,
  mode: "moveAppToLocale" | "moveLocaleToApp",
): Promise<void> {
  const appDir = path.join(projectPath, "src", "app");
  const localeDir = path.join(appDir, "[locale]");

  // Check if the app directory exists
  if (await fs.pathExists(appDir)) {
    if (mode === "moveAppToLocale") {
      relinka("info-verbose", "Moving src/app content to src/app/[locale]...");

      // Ensure the [locale] directory exists or create it
      if (!(await fs.pathExists(localeDir))) {
        try {
          await fs.ensureDir(localeDir);
          relinka("success-verbose", "Created src/app/[locale] directory.");
        } catch (error) {
          relinka(
            "error-verbose",
            `Failed to create [locale] directory: ${error}`,
          );
          return;
        }
      }

      // Move files from src/app to src/app/[locale]
      const files = await fs.readdir(appDir);

      const movePromises = files.map(async (file) => {
        const oldPath = path.join(appDir, file);
        const newPath = path.join(localeDir, file);

        if (file === "[locale]" || IGNORED_PATHS.includes(file)) {
          relinka(
            "info-verbose",
            `Skipping ${file} as it's in the ignore list`,
          );
          return;
        }

        try {
          // Check if the file already exists at the new location
          const fileExists = await fs.pathExists(newPath);
          if (fileExists) {
            relinka(
              "info-verbose",
              `File ${file} already exists in ${localeDir}, skipping.`,
            );
            return;
          }

          await fs.move(oldPath, newPath);
          relinka("info-verbose", `Moved ${file} to ${newPath}`);
        } catch (error) {
          relinka(
            "error-verbose",
            `Error moving ${file} to ${newPath}: ${error}`,
          );
        }
      });

      // Wait for all file moves to complete
      await Promise.all(movePromises);

      relinka(
        "success-verbose",
        "Files moved to src/app/[locale] successfully.",
      );
    } else if (mode === "moveLocaleToApp") {
      relinka(
        "info-verbose",
        "Moving src/app/[locale] content back to src/app...",
      );

      if (!(await fs.pathExists(localeDir))) {
        relinka("info-verbose", "src/app/[locale] directory not found.");
        return;
      }

      // Move files from src/app/[locale] back to src/app
      const files = await fs.readdir(localeDir);

      const movePromises = files.map(async (file) => {
        const oldPath = path.join(localeDir, file);
        const newPath = path.join(appDir, file);

        try {
          // Check if the file already exists at the target location
          const fileExists = await fs.pathExists(newPath);
          if (fileExists) {
            relinka(
              "info-verbose",
              `File ${file} already exists in ${appDir}, skipping.`,
            );
            return;
          }

          await fs.move(oldPath, newPath);
          relinka("info-verbose", `Moved ${file} back to ${newPath}`);
        } catch (error) {
          relinka(
            "error-verbose",
            `Error moving ${file} back to ${newPath}: ${error}`,
          );
        }
      });

      // Wait for all file moves to complete
      await Promise.all(movePromises);

      // Remove the now empty [locale] directory
      try {
        const remainingFiles = await fs.readdir(localeDir);
        if (remainingFiles.length === 0) {
          await fs.remove(localeDir);
          relinka(
            "success-verbose",
            "Removed empty src/app/[locale] directory.",
          );
        }
      } catch (error) {
        relinka(
          "error-verbose",
          `Failed to remove [locale] directory: ${error}`,
        );
      }

      relinka("success-verbose", "Files moved back to src/app successfully.");
    }
  } else {
    relinka("info-verbose", "src/app directory not found.");
  }
}
