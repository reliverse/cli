import fs from "fs-extra";
import os from "os";
import path from "pathe";

import {
  FILE_PATHS,
  FILES_TO_DOWNLOAD,
  REPO_FULL_URLS,
} from "~/app/data/constants.js";
import { cloneAndCopyFiles } from "~/utils/cloneAndCopyFiles.js";
import { relinka } from "~/utils/console.js";
import { getCurrentWorkingDirectory } from "~/utils/fs.js";

export async function downloadI18nFiles(
  targetDir: string,
  isDev: boolean,
): Promise<void> {
  const cwd = getCurrentWorkingDirectory();
  // In dev mode, always use tests-runtime in cwd, not nested in targetDir
  // TODO: maybe we should reimplement this in a better way
  const tempRepoDir = isDev
    ? path.join(cwd, "tests-runtime", FILE_PATHS.tempRepoClone)
    : path.join(
        os.homedir(),
        ".reliverse",
        "projects",
        FILE_PATHS.tempRepoClone,
      );

  try {
    let isDirEmpty = true;

    if (await fs.pathExists(tempRepoDir)) {
      const dirContents = await fs.readdir(tempRepoDir);
      isDirEmpty = dirContents.length === 0;

      if (!isDirEmpty) {
        relinka(
          "error-verbose",
          `Temp directory '${tempRepoDir}' already exists and is not empty.`,
        );

        const skipClone = true;

        if (skipClone) {
          relinka(
            "info",
            `Skipping cloning and using the existing '${tempRepoDir}' folder.`,
          );
        } else {
          relinka(
            "info-verbose",
            "Cleaning up the temp directory and cloning again...",
          );
          await fs.emptyDir(tempRepoDir);
          relinka(
            "info",
            `[downloadI18nFiles] Temp directory '${tempRepoDir}' is now empty to overwrite existing folder content.`,
          );
          isDirEmpty = true;
        }
      }
    }

    if (isDirEmpty) {
      relinka(
        "info",
        "Cloning repository for i18n-specific layout.tsx and page.tsx...",
      );

      await cloneAndCopyFiles(
        FILES_TO_DOWNLOAD,
        targetDir,
        true,
        REPO_FULL_URLS.relivatorGithubLink,
        tempRepoDir,
      );
    }

    for (const file of FILES_TO_DOWNLOAD) {
      const tempFilePath = path.join(tempRepoDir, file);
      const targetFilePath = path.join(targetDir, file);

      relinka("info-verbose", `Checking if ${tempFilePath} exists...`);

      if (await fs.pathExists(tempFilePath)) {
        relinka(
          "info-verbose",
          `File ${tempFilePath} exists. Copying to target...`,
        );

        if (path.resolve(tempFilePath) !== path.resolve(targetFilePath)) {
          await fs.copy(tempFilePath, targetFilePath);
          relinka("info-verbose", `Copied ${file} to ${targetFilePath}.`);
        } else {
          relinka(
            "error-verbose",
            `Skipping copying file ${file} because source and destination are the same.`,
          );
        }
      } else {
        relinka(
          "error-verbose",
          `File ${tempFilePath} not found in the cloned repository.`,
        );
        throw new Error(`File ${tempFilePath} not found.`);
      }
    }

    relinka(
      "info-verbose",
      "i18n-specific files downloaded and copied successfully.",
    );
    relinka(
      "info-verbose",
      "Internationalization was successfully integrated.",
    );
  } catch (error) {
    relinka(
      "error-verbose",
      `Error during file cloning or copying: ${error.toString()}`,
    );
  } finally {
    const disableTempCloneRemoving = false;

    if (!disableTempCloneRemoving && (await fs.pathExists(tempRepoDir))) {
      relinka("info-verbose", "Cleaning up temporary repository directory...");
      await fs.remove(tempRepoDir);
      relinka("info-verbose", "Temporary repository directory removed.");
    }
  }
}
