import { relinka } from "@reliverse/relinka";
import fs from "fs-extra";
import path from "pathe";
import { simpleGit } from "simple-git";

import { DEBUG, FILE_CONFLICTS } from "../app/data/constants.js";

// Function to clone and copy files from the repository
export async function cloneAndCopyFiles(
  filesToDownload: string[],
  targetDir: string,
  overwrite: boolean,
  repoUrl: string,
  tempRepoDir: string,
): Promise<void> {
  DEBUG.enableVerboseLogging &&
    relinka.info(`Cloning from ${repoUrl} into ${tempRepoDir}...`);

  relinka.info(
    "✨ Please wait while we make magic. It all depends on your internet speed.",
  );

  try {
    const git = simpleGit();

    DEBUG.enableVerboseLogging && relinka.log("tempRepoDir", tempRepoDir);

    // Step 0: Check if the tempRepoDir already exists and is not empty
    if (await fs.pathExists(tempRepoDir)) {
      const isDirEmpty = await fs.readdir(tempRepoDir);

      if (isDirEmpty.length > 0) {
        // If directory is not empty and overwrite is not allowed
        if (!overwrite) {
          relinka.error(
            `Error: Destination path '${tempRepoDir}' already exists and is not an empty directory.`,
          );

          return;
        }

        // If overwrite is allowed, clean the directory
        await fs.emptyDir(tempRepoDir);
        DEBUG.enableVerboseLogging &&
          relinka.info(
            `[cloneAndCopyFiles] Temp directory '${tempRepoDir}' is now empty to overwrite existing folder content.`,
          );
      }
    }

    // Step 1: Clone the repository into tempRepoDir
    await git.clone(repoUrl, tempRepoDir, ["--depth", "1"]);
    DEBUG.enableVerboseLogging &&
      relinka.success("Temporary repository cloned successfully.");

    // Step 2: Copy the necessary files to the target directory
    for (const fileName of filesToDownload) {
      // Find if the file is in FILE_CONFLICTS and has shouldCopy: false
      const fileConflict = FILE_CONFLICTS.find(
        (file) => file.fileName === fileName && !file.shouldCopy,
      );

      // Skip copying if shouldCopy is false
      if (fileConflict) {
        DEBUG.enableVerboseLogging &&
          relinka.info(
            `Skipping ${fileName} as it is marked with shouldCopy: false.`,
          );
        continue;
      }

      const sourcePath = path.join(tempRepoDir, fileName);
      const destPath = path.join(targetDir, fileName);

      // Log source and destination paths for debugging
      DEBUG.enableVerboseLogging &&
        relinka.info(`Copying from '${sourcePath}' to '${destPath}'...`);

      // Check if source and destination are the same
      if (path.resolve(sourcePath) === path.resolve(destPath)) {
        relinka.error(
          `Error: Source and destination paths must not be the same. Source: ${sourcePath}, Destination: ${destPath}`,
        );
        continue; // Skip the file if source and destination are the same
      }

      if ((await fs.pathExists(destPath)) && !overwrite) {
        relinka.warn(`${fileName} already exists in ${targetDir}.`);
      } else {
        await fs.copy(sourcePath, destPath);
        DEBUG.enableVerboseLogging &&
          relinka.success(`${fileName} copied to ${destPath}.`);
      }
    }

    // Step 3: Clean up the temporary clone directory if specified
    if (!DEBUG.disableTempCloneRemoving) {
      await fs.remove(tempRepoDir);
      relinka.info("Temporary clone removed.");
    }
  } catch (error) {
    relinka.error(`Error during file cloning: ${error}`);
  }
}
