import { task } from "@reliverse/prompts";
import fs from "fs-extra";
import path from "pathe";

import { fileCategories } from "~/app/data/constants.js";
import { cloneAndCopyFiles } from "~/utils/cloneAndCopyFiles.js";
import { relinka } from "~/utils/console.js";

const RELIVATOR_REPO = "https://github.com/blefnk/relivator";

// Helper function to download files
async function downloadFiles(
  filesToDownload: string[],
  targetDir: string,
  overwrite: boolean,
): Promise<void> {
  if (filesToDownload.length === 0) {
    relinka("info", "No files to download");
    return;
  }

  await task({
    spinnerSolution: "ora",
    initialMessage: "Downloading configuration files...",
    successMessage: "✅ Configuration files downloaded successfully!",
    errorMessage: "❌ Failed to download configuration files",
    async action() {
      // Create a temporary directory within the target project
      const tempRepoDir = path.join(targetDir, ".temp-config");

      try {
        // Ensure target directory exists
        await fs.ensureDir(targetDir);

        await cloneAndCopyFiles(
          filesToDownload,
          targetDir,
          overwrite,
          RELIVATOR_REPO,
          tempRepoDir,
        );
      } finally {
        // Clean up temporary directory if it exists
        await fs.remove(tempRepoDir).catch(() => {
          // Ignore cleanup errors
        });
      }
    },
  });
}

// Main function to check and download files
export async function askCheckAndDownloadFiles(
  targetDir: string,
): Promise<void> {
  try {
    // Get list of files to check
    const filesToCheck = Object.values(fileCategories).flat();

    // Check which files exist using Promise.all for parallel checks
    const fileExistsChecks = await Promise.all(
      filesToCheck.map(async (file) => {
        const filePath = path.join(targetDir, file);
        const exists = await fs.pathExists(filePath);
        return { file, exists };
      }),
    );

    const existingFiles = fileExistsChecks
      .filter((check) => check.exists)
      .map((check) => check.file);
    const filesToDownload = fileExistsChecks
      .filter((check) => !check.exists)
      .map((check) => check.file);

    if (existingFiles.length > 0) {
      relinka(
        "info",
        `Found ${existingFiles.length} existing configuration files`,
      );
      // Download missing files without overwriting existing ones
      await downloadFiles(filesToDownload, targetDir, false);
    } else {
      // No existing files, download everything
      await downloadFiles(filesToDownload, targetDir, true);
    }
  } catch (error) {
    relinka(
      "error",
      `Failed to download configuration files: ${error instanceof Error ? error.message : String(error)}`,
    );
    throw error; // Re-throw to allow caller to handle the error
  }
}
