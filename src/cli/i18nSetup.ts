import { consola } from "consola";
import fs from "fs-extra";
import path from "pathe";

import { cloneAndCopyFiles } from "~/relimter/gitOperations";

// Function to move the content of src/app to src/app/[locale]
export async function moveAppToLocale(targetDir: string): Promise<void> {
  const appDir = path.join(targetDir, "src", "app");
  const localeDir = path.join(appDir, "[locale]");

  // Check if the app directory exists
  if (await fs.pathExists(appDir)) {
    consola.info("Moving src/app content to src/app/[locale]...");

    // Ensure the [locale] directory exists
    try {
      await fs.ensureDir(localeDir); // Ensure locale directory
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
      if (file === "[locale]") continue;

      try {
        await fs.move(oldPath, newPath);
        consola.info(`Moved ${file} to ${newPath}`);
      } catch (error) {
        consola.error(`Error moving ${file} to ${newPath}:`, error);
      }
    }

    consola.success("Files moved to src/app/[locale] successfully.");
  } else {
    consola.warn("src/app directory not found.");
  }
}

// Function to download i18n layout.ts and page.ts files
export async function downloadI18nFiles(
  targetDir: string,
  isDevelopment: boolean,
): Promise<void> {
  const tempRepoDir = isDevelopment
    ? path.join(targetDir, "..", "temp-repo-clone") // For development
    : path.join(targetDir, "temp-repo-clone"); // For production

  // Check if the temporary directory already exists, if so, remove it
  if (await fs.pathExists(tempRepoDir)) {
    consola.info("Cleaning up existing temp-repo-clone directory...");
    await fs.remove(tempRepoDir); // Remove the existing directory
  }

  consola.info("Downloading i18n-specific layout.ts and page.ts...");

  const filesToDownload = ["src/app/layout.ts", "src/app/page.ts"];
  const i18nRepoUrl = "https://github.com/blefnk/relivator";

  // Clone and copy the required files
  try {
    await cloneAndCopyFiles(
      filesToDownload,
      targetDir,
      true,
      i18nRepoUrl,
      tempRepoDir,
    ); // Pass the temp directory explicitly
    consola.success("i18n-specific files downloaded successfully.");
  } catch (error) {
    consola.error("Error during file cloning:", error);
  } finally {
    // Clean up the temporary repository directory after the process
    await fs.remove(tempRepoDir);
  }
}
