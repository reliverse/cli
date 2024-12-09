import { confirmPrompt, multiselectPrompt } from "@reliverse/prompts";
import { relinka } from "@reliverse/relinka";
import path from "pathe";

import { DEBUG, FILE_PATHS, fileCategories } from "~/app/data/constants.js";
import { cloneAndCopyFiles } from "~/utils/cloneAndCopyFiles.js";
import { verbose } from "~/utils/console.js";
import { checkFileExists } from "~/utils/fileUtils.js";
import { getCurrentWorkingDirectory } from "~/utils/fs.js";

import { resolveProjectConflicts } from "./askToResolveProjectConflicts.js";

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
      relinka.info(
        `The following files are missing in ${targetDir}: ${missingFiles.join(", ")}`,
      );

    const categoriesToDownload = await multiselectPrompt({
      title: "Select the file categories you want to download:",
      titleColor: "cyanBright",
      // content:
      // "I have already chosen the recommended categories. Please modify the selections if you want something else.",
      options: Object.keys(fileCategories).map((category) => ({
        label: category,
        value: category,
        hint: category,
      })),
    });

    const filesToDownload = categoriesToDownload
      .flatMap((category) => fileCategories[category] || [])
      .filter(Boolean);

    const cwd = getCurrentWorkingDirectory();
    const tempCloneRepo = "https://github.com/blefnk/relivator";
    const tempRepoDir = path.resolve(cwd, `../${FILE_PATHS.tempRepoClone}`);

    // Handle conflicts for already existing files
    if (existingFiles.length > 0) {
      const replaceAll = await confirmPrompt({
        defaultValue: true,
        title:
          "Some files already exist. Do you want to replace all existing files? (N opens Conflict Management menu)",
        titleColor: "cyanBright",
      });

      if (!replaceAll) {
        const filesToReplace = await multiselectPrompt({
          title: "Select the files you want to replace:",
          titleColor: "cyanBright",
          options: existingFiles.map((file) => ({
            label: file,
            value: file,
            hint: file,
          })),
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
    relinka.success(
      `All required files are present in ${targetDir}. Codemod is finished.`,
    );
  }
};
