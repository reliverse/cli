import fs from "fs-extra";
import path from "pathe";

import { FILES_TO_DOWNLOAD, REPO_FULL_URLS } from "~/app/data/constants.js";
import { cloneAndCopyFiles } from "~/utils/cloneAndCopyFiles.js";
import { relinka } from "~/utils/console.js";

export async function downloadI18nFiles(targetDir: string): Promise<void> {
  // Create a temporary directory within the target project
  const tempRepoDir = path.join(targetDir, ".temp-i18n");

  try {
    // Ensure temp directory exists and is empty
    await fs.emptyDir(tempRepoDir);
    relinka("info", "Cloning repository for i18n-specific files...");

    // Ensure target directory exists
    await fs.ensureDir(targetDir);

    await cloneAndCopyFiles(
      FILES_TO_DOWNLOAD,
      targetDir,
      true,
      REPO_FULL_URLS.relivatorGithubLink,
      tempRepoDir,
    );

    relinka("success", "Internationalization was successfully integrated.");
  } catch (error) {
    relinka(
      "error",
      `Error during i18n setup: ${error instanceof Error ? error.message : String(error)}`,
    );
    throw error; // Re-throw to allow caller to handle the error
  } finally {
    // Clean up temporary directory if it exists
    await fs.remove(tempRepoDir).catch(() => {
      // Ignore cleanup errors
    });
  }
}
