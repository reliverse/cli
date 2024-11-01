import { consola } from "consola";
import fs from "fs-extra";
import path from "pathe";
import { simpleGit } from "simple-git";

import { DEBUG, FILE_CONFLICTS } from "~/app";

// Function to clone and copy files from the repository
export async function cloneAndCopyFiles(
  filesToDownload: string[],
  targetDir: string,
  overwrite: boolean,
  repoUrl: string,
  tempRepoDir: string,
): Promise<void> {
  DEBUG.enableVerboseLogging &&
    consola.info(`Cloning from ${repoUrl} into ${tempRepoDir}...`);

  console.info(
    "✨ Please wait while we make magic. It all depends on your internet speed.",
  );

  try {
    const git = simpleGit();

    DEBUG.enableVerboseLogging && consola.log("tempRepoDir", tempRepoDir);

    // Step 0: Check if the tempRepoDir already exists and is not empty
    if (await fs.pathExists(tempRepoDir)) {
      const isDirEmpty = await fs.readdir(tempRepoDir);

      if (isDirEmpty.length > 0) {
        // If directory is not empty and overwrite is not allowed
        if (!overwrite) {
          consola.error(
            `Error: Destination path '${tempRepoDir}' already exists and is not an empty directory.`,
          );

          return;
        }

        // If overwrite is allowed, clean the directory
        await fs.emptyDir(tempRepoDir);
        DEBUG.enableVerboseLogging &&
          consola.info(
            `[cloneAndCopyFiles] Temp directory '${tempRepoDir}' is now empty to overwrite existing folder content.`,
          );
      }
    }

    // Step 1: Clone the repository into tempRepoDir
    await git.clone(repoUrl, tempRepoDir, ["--depth", "1"]);
    DEBUG.enableVerboseLogging &&
      consola.success("Temporary repository cloned successfully.");

    // Step 2: Copy the necessary files to the target directory
    for (const fileName of filesToDownload) {
      // Find if the file is in FILE_CONFLICTS and has shouldCopy: false
      const fileConflict = FILE_CONFLICTS.find(
        (file) => file.fileName === fileName && !file.shouldCopy,
      );

      // Skip copying if shouldCopy is false
      if (fileConflict) {
        DEBUG.enableVerboseLogging &&
          consola.info(
            `Skipping ${fileName} as it is marked with shouldCopy: false.`,
          );
        continue;
      }

      const sourcePath = path.join(tempRepoDir, fileName);
      const destPath = path.join(targetDir, fileName);

      // Log source and destination paths for debugging
      DEBUG.enableVerboseLogging &&
        consola.info(`Copying from '${sourcePath}' to '${destPath}'...`);

      // Check if source and destination are the same
      if (path.resolve(sourcePath) === path.resolve(destPath)) {
        consola.error(
          `Error: Source and destination paths must not be the same. Source: ${sourcePath}, Destination: ${destPath}`,
        );
        continue; // Skip the file if source and destination are the same
      }

      if ((await fs.pathExists(destPath)) && !overwrite) {
        consola.warn(`${fileName} already exists in ${targetDir}.`);
      } else {
        await fs.copy(sourcePath, destPath);
        DEBUG.enableVerboseLogging &&
          consola.success(`${fileName} copied to ${destPath}.`);
      }
    }

    // Step 3: Clean up the temporary clone directory if specified
    if (!DEBUG.disableTempCloneRemoving) {
      await fs.remove(tempRepoDir);
      consola.info("Temporary clone removed.");
    }
  } catch (error) {
    consola.error(`Error during file cloning: ${error}`);
  }
}
