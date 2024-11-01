import { consola } from "consola";
import fs from "fs-extra";
import path from "pathe";

import { cloneAndCopyFiles } from "~/utils/cloneAndCopyFiles";
import { DEBUG, FILE_PATHS, FILES_TO_DOWNLOAD, REPO_FULL_URLS } from "~/app";

// Function to download i18n layout.tsx and page.tsx files
export async function downloadI18nFiles(
  targetDir: string,
  isDev: boolean,
): Promise<void> {
  const tempRepoDir = isDev
    ? path.join(targetDir, "..", FILE_PATHS.tempRepoClone) // Adjust for development
    : path.join(targetDir, FILE_PATHS.tempRepoClone); // For production

  try {
    // Step 0: Check if the tempRepoDir already exists and handle it
    let isDirEmpty = true;

    if (await fs.pathExists(tempRepoDir)) {
      const dirContents = await fs.readdir(tempRepoDir);

      isDirEmpty = dirContents.length === 0;

      if (!isDirEmpty) {
        DEBUG.enableVerboseLogging &&
          consola.info(
            `Temp directory '${tempRepoDir}' already exists and is not empty.`,
          );

        // Prompt the user to decide if they want to skip or clean up the directory
        const skipClone = true;

        // const skipClone = await consola.prompt(
        // "The directory already exists and contains files. Do you want to skip cloning and use the existing files?",
        // { initial: true, type: "confirm" },
        // );

        if (skipClone) {
          DEBUG.enableVerboseLogging &&
            consola.info(
              `Skipping cloning and using the existing '${tempRepoDir}' folder.`,
            );
        } else {
          consola.info("Cleaning up the temp directory and cloning again...");
          await fs.emptyDir(tempRepoDir); // Clean up the directory
          DEBUG.enableVerboseLogging &&
            consola.info(
              `[downloadI18nFiles] Temp directory '${tempRepoDir}' is now empty to overwrite existing folder content.`,
            );
          isDirEmpty = true;
        }
      }
    }

    if (isDirEmpty) {
      DEBUG.enableVerboseLogging &&
        consola.info(
          "Cloning repository for i18n-specific layout.tsx and page.tsx...",
        );

      // Step 1: Clone the repository
      await cloneAndCopyFiles(
        FILES_TO_DOWNLOAD,
        targetDir,
        true,
        REPO_FULL_URLS.relivatorGithubLink,
        tempRepoDir,
      );
    }

    // Step 2: Check if the required files exist in the temp repo and copy them
    for (const file of FILES_TO_DOWNLOAD) {
      const tempFilePath = path.join(tempRepoDir, file);
      const targetFilePath = path.join(targetDir, file);

      DEBUG.enableVerboseLogging &&
        consola.info(`Checking if ${tempFilePath} exists...`);

      if (await fs.pathExists(tempFilePath)) {
        DEBUG.enableVerboseLogging &&
          consola.info(`File ${tempFilePath} exists. Copying to target...`);

        if (path.resolve(tempFilePath) !== path.resolve(targetFilePath)) {
          await fs.copy(tempFilePath, targetFilePath);
          DEBUG.enableVerboseLogging &&
            consola.success(`Copied ${file} to ${targetFilePath}.`);
        } else {
          consola.warn(
            `Skipping copying file ${file} because source and destination are the same.`,
          );
        }
      } else {
        consola.error(
          `File ${tempFilePath} not found in the cloned repository.`,
        );

        throw new Error(`File ${tempFilePath} not found.`);
      }
    }

    DEBUG.enableVerboseLogging &&
      consola.success(
        "i18n-specific files downloaded and copied successfully.",
      );
    consola.success("Internationalization (i18n) was successfully integrated.");
  } catch (error) {
    consola.error("Error during file cloning or copying:", error);
  } finally {
    // Step 3: Conditionally clean up the temp directory after all operations are completed
    if (!DEBUG.disableTempCloneRemoving && (await fs.pathExists(tempRepoDir))) {
      consola.info("Cleaning up temporary repository directory...");
      await fs.remove(tempRepoDir); // Ensure the temp folder is removed after all tasks
      consola.success("Temporary repository directory removed.");
    }
  }
}
