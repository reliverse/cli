import { relinka } from "@reliverse/relinka";
import fs from "fs-extra";
import path from "pathe";
import { simpleGit } from "simple-git";

import type { CloneError } from "~/types.js";
import type { CopyError } from "~/types.js";

import { FILE_CONFLICTS } from "~/app/constants.js";

// Function to clone and copy files from the repository
export async function cloneAndCopyFiles(
  filesToDownload: string[],
  projectPath: string,
  overwrite: boolean,
  repoUrl: string,
  tempRepoDir: string,
): Promise<void> {
  relinka("info", `Cloning from ${repoUrl}...`);

  const git = simpleGit();

  try {
    // Ensure the temporary directory exists and is empty
    await fs.emptyDir(tempRepoDir);

    // Clone the repository into tempRepoDir
    try {
      await git.clone(repoUrl, tempRepoDir, ["--depth", "1"]);
    } catch (error) {
      const cloneError: CloneError = {
        message: error instanceof Error ? error.message : String(error),
        name: "CloneError",
      };
      throw cloneError;
    }

    // Copy the necessary files to the target directory
    const copyErrors: CopyError[] = [];
    const copyPromises = filesToDownload.map(async (fileName) => {
      // Check conflicts
      const fileConflict = FILE_CONFLICTS.find(
        (file) => file.fileName === fileName && !file.shouldCopy,
      );

      // Skip copying if shouldCopy is false
      if (fileConflict) {
        relinka("info", `Skipping ${fileName} (marked as do not copy)`);
        return;
      }

      const sourcePath = path.join(tempRepoDir, fileName);
      const destPath = path.join(projectPath, fileName);

      // Skip if source and destination are the same
      if (path.resolve(sourcePath) === path.resolve(destPath)) {
        return;
      }

      try {
        // Check if source exists
        if (!(await fs.pathExists(sourcePath))) {
          throw new Error("Source file does not exist");
        }

        // Check if destination exists and we're not overwriting
        if (!overwrite && (await fs.pathExists(destPath))) {
          relinka("warn", `${fileName} already exists, skipping...`);
          return;
        }

        // Ensure the destination directory exists
        await fs.ensureDir(path.dirname(destPath));

        // Copy the file
        await fs.copy(sourcePath, destPath, { overwrite });
        relinka("success", `Copied ${fileName}`);
      } catch (error) {
        copyErrors.push({
          message: error instanceof Error ? error.message : String(error),
          name: "CopyError",
          fileName,
        });
      }
    });

    // Wait for all copy operations to complete
    await Promise.all(copyPromises);

    // If there were any copy errors, throw them as a group
    if (copyErrors.length > 0) {
      throw new Error(
        `Failed to copy files:\n${copyErrors
          .map((e) => `${e.fileName}: ${e.message}`)
          .join("\n")}`,
      );
    }
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error(`Unexpected error: ${String(error)}`);
  }
}
