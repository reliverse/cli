import { checkbox, confirm } from "@inquirer/prompts";
import { consola } from "consola";
import path from "pathe";
import { resolveProjectConflicts } from "~/menu/12-askToResolveProjectConflicts";

import { cloneAndCopyFiles } from "~/utils/cloneAndCopyFiles";
import { checkFileExists } from "~/utils/fileUtils";
import { getCurrentWorkingDirectory } from "~/utils/fs";
import { DEBUG, FILE_PATHS, fileCategories } from "~/app";
import { verbose } from "~/utils/console";

export const askCheckAndDownloadFiles = async (
  targetDir: string,
  projectName: string,
): Promise<void> => {
  const missingFiles: string[] = [];
  const existingFiles: string[] = [];

  verbose(
    "info",
    `Checking if all required files are present in ${projectName} located in ${targetDir}`,
  );

  // Check if any files in each category are missing or already exist
  for (const category in fileCategories) {
    const filesInCategory = fileCategories[category];

    if (!filesInCategory) {
      continue;
    }

    for (const file of filesInCategory) {
      const filePath = path.join(targetDir, file);

      if (!checkFileExists(filePath)) {
        missingFiles.push(file);
      } else {
        existingFiles.push(file);
      }
    }
  }

  // Handle project files conflicts
  await resolveProjectConflicts(targetDir);

  // If there are missing files, prompt the user to download them
  if (missingFiles.length > 0) {
    DEBUG.enableVerboseLogging &&
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
      .flatMap((category) => fileCategories[category] || [])
      .filter(Boolean);

    const cwd = getCurrentWorkingDirectory();
    const tempCloneRepo = "https://github.com/blefnk/relivator";
    const tempRepoDir = path.resolve(cwd, `../${FILE_PATHS.tempRepoClone}`);

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
          [...filesToDownload, ...filesToReplace].filter(Boolean),
          targetDir,
          false,
          tempCloneRepo,
          tempRepoDir,
        );
      } else {
        await cloneAndCopyFiles(
          filesToDownload.filter(Boolean),
          targetDir,
          true,
          tempCloneRepo,
          tempRepoDir,
        ); // Replace all existing files
      }
    } else {
      await cloneAndCopyFiles(
        filesToDownload.filter(Boolean),
        targetDir,
        false,
        tempCloneRepo,
        tempRepoDir,
      ); // No conflicts, just download the files
    }
  } else {
    consola.success(
      `All required files are present in ${targetDir}. Codemod is finished.`,
    );
  }
};
