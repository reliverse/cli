import { checkbox, confirm } from "@inquirer/prompts";
import { consola } from "consola";
import path from "pathe";

import { getCurrentWorkingDirectory } from "~/utils/fs";

import {
  handleESLintConflict,
  handlePrettierConflict,
} from "./conflictHandlers";
import { fileCategories } from "./fileCategories";
import { checkFileExists } from "./fileUtils";
import { cloneAndCopyFiles } from "./gitOperations";

// Function to check for required files and allow the user to download them
export const checkAndDownloadFiles = async (
  targetDir: string,
): Promise<void> => {
  const missingFiles: string[] = [];
  const existingFiles: string[] = [];

  // Check if any files in each category are missing or already exist
  for (const category in fileCategories) {
    const filesInCategory =
      fileCategories[category as keyof typeof fileCategories];

    if (!filesInCategory) continue;

    for (const file of filesInCategory) {
      const filePath = path.join(targetDir, file);

      if (!checkFileExists(filePath)) {
        missingFiles.push(file);
      } else {
        existingFiles.push(file);
      }
    }
  }

  // Handle `.eslintrc.cjs` and `prettier.config.js` conflicts
  await handleESLintConflict(targetDir);
  await handlePrettierConflict(targetDir);

  // If there are missing files, prompt the user to download them
  if (missingFiles.length > 0) {
    consola.info(
      `The following files are missing in ${targetDir}: ${missingFiles.join(", ")}`,
    );

    const categoriesToDownload = await checkbox({
      choices: Object.keys(fileCategories).map((category) => ({
        name: category,
        checked: true,
        value: category,
      })),
      message: "Select the file categories you want to download:",
    });

    const filesToDownload = categoriesToDownload
      .flatMap(
        (category) =>
          fileCategories[category as keyof typeof fileCategories] || [],
      )
      .filter(Boolean); // Ensure there are no undefined values

    const cwd = getCurrentWorkingDirectory();
    const tempCloneRepo = "https://github.com/blefnk/relivator";
    const tempCloneDir = `${cwd}/..`;

    // Handle conflicts for already existing files
    if (existingFiles.length > 0) {
      const replaceAll = await confirm({
        default: true,
        message:
          "Some files already exist. Do you want to replace all existing files? (N opens Conflict Management menu)",
      });

      if (!replaceAll) {
        const filesToReplace = await checkbox({
          choices: existingFiles.map((file) => ({
            name: file,
            checked: false,
            value: file,
          })),
          message: "Select the files you want to replace:",
        });

        await cloneAndCopyFiles(
          [...filesToDownload, ...filesToReplace].filter(Boolean), // Filter out undefined values
          targetDir,
          false,
          tempCloneRepo,
          tempCloneDir,
        );
      } else {
        await cloneAndCopyFiles(
          filesToDownload.filter(Boolean), // Filter out undefined values
          targetDir,
          true,
          tempCloneRepo,
          tempCloneDir,
        ); // Replace all existing files
      }
    } else {
      await cloneAndCopyFiles(
        filesToDownload.filter(Boolean), // Filter out undefined values
        targetDir,
        false,
        tempCloneRepo,
        tempCloneDir,
      ); // No conflicts, just download the files
    }
  } else {
    consola.success(
      `All required files are present in ${targetDir}. Codemod is finished.`,
    );
  }
};
