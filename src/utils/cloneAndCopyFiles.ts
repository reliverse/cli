import fs from "fs-extra";
import path from "pathe";
import { simpleGit } from "simple-git";

import { relinka } from "~/utils/console.js";

import { FILE_CONFLICTS } from "../app/data/constants.js";

// Function to clone and copy files from the repository
export async function cloneAndCopyFiles(
  filesToDownload: string[],
  targetDir: string,
  overwrite: boolean,
  repoUrl: string,
  tempRepoDir: string,
): Promise<void> {
  relinka("info-verbose", `Cloning from ${repoUrl} into ${tempRepoDir}...`);

  // msg({
  //   type: "M_INFO",
  //   title:
  //     "✨ Please wait while I'm making magic... It all also depends on your internet speed...",
  //   titleColor: "retroGradient",
  // });

  const git = simpleGit();
  relinka("info-verbose", `tempRepoDir: ${tempRepoDir}`);

  try {
    // Step 0: Ensure the temporary directory is ready for cloning
    try {
      if (await fs.pathExists(tempRepoDir)) {
        const filesInDir = await fs.readdir(tempRepoDir);
        if (filesInDir.length > 0) {
          // If directory is not empty and overwrite is not allowed
          if (!overwrite) {
            // msg({
            //   type: "M_ERROR",
            //   title: `Error: Destination path '${tempRepoDir}' already exists and is not empty.`,
            //   titleColor: "retroGradient",
            // });
            return;
          }

          // If overwrite is allowed, empty the directory
          await fs.emptyDir(tempRepoDir);
          relinka(
            "info-verbose",
            `Temp directory '${tempRepoDir}' emptied for overwrite.`,
          );
        }
      }
    } catch (dirError: any) {
      relinka(
        "error-verbose",
        `Error checking or preparing directory: ${dirError.message || dirError}`,
      );
      return;
    }

    // Step 1: Clone the repository into tempRepoDir
    try {
      await git.clone(repoUrl, tempRepoDir, ["--depth", "1"]);
      relinka("success-verbose", "Temporary repository cloned successfully.");
    } catch (cloneError: any) {
      relinka(
        "error-verbose",
        `Error during repository cloning: ${cloneError.message || cloneError}`,
      );
      return;
    }

    // Step 2: Copy the necessary files to the target directory
    for (const fileName of filesToDownload) {
      // Check conflicts
      const fileConflict = FILE_CONFLICTS.find(
        (file) => file.fileName === fileName && !file.shouldCopy,
      );

      // Skip copying if shouldCopy is false
      if (fileConflict) {
        relinka(
          "info",
          `Skipping ${fileName} as it is marked with shouldCopy: false.`,
        );
        continue;
      }

      const sourcePath = path.join(tempRepoDir, fileName);
      const destPath = path.join(targetDir, fileName);

      relinka(
        "info-verbose",
        `Copying from '${sourcePath}' to '${destPath}'...`,
      );

      // Ensure source and destination differ
      if (path.resolve(sourcePath) === path.resolve(destPath)) {
        relinka(
          "error-verbose",
          `Error: Source and destination must not be the same. Source: ${sourcePath}, Destination: ${destPath}`,
        );
        continue; // Skip this file
      }

      try {
        if ((await fs.pathExists(destPath)) && !overwrite) {
          // If the file already exists and we do not overwrite
          relinka(
            "error-verbose",
            `${fileName} already exists in ${targetDir}.`,
          );
        } else {
          // Copy the file
          await fs.copy(sourcePath, destPath);
          relinka("success-verbose", `${fileName} copied to ${destPath}.`);
        }
      } catch (copyError: any) {
        relinka(
          "error-verbose",
          `Error copying ${fileName}: ${copyError.message || copyError}`,
        );
      }
    }

    const disableTempCloneRemoving = false;

    // Step 3: Clean up the temporary clone directory if specified
    if (!disableTempCloneRemoving) {
      try {
        await fs.remove(tempRepoDir);
        relinka("info-verbose", "Temporary clone removed.");
      } catch (cleanupError: any) {
        relinka(
          "error-verbose",
          `Could not remove temporary clone: ${cleanupError.message || cleanupError}`,
        );
      }
    }
  } catch (error: any) {
    // Catch any unexpected errors during the entire process
    relinka(
      "error-verbose",
      `Unexpected error during file cloning and copying: ${error.message || error}`,
    );
  }
}
