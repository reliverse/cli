import { confirmPrompt, multiselectPrompt, task } from "@reliverse/prompts";
import path from "pathe";

import { FILE_PATHS, fileCategories } from "~/app/data/constants.js";
import { cloneAndCopyFiles } from "~/utils/cloneAndCopyFiles.js";
import { relinka } from "~/utils/console.js";
import { checkFileExists } from "~/utils/fileUtils.js";
import { getCurrentWorkingDirectory } from "~/utils/fs.js";

import { resolveProjectConflicts } from "./askToResolveProjectConflicts.js";

// Helper function to download files
async function downloadFiles(
  filesToDownload: string[],
  filesToReplace: string[],
  targetDir: string,
  replaceAll: boolean,
  tempCloneRepo: string,
  tempRepoDir: string,
) {
  await task({
    spinnerSolution: "ora",
    initialMessage: "Downloading files...",
    successMessage: "✅ Files downloaded successfully!",
    errorMessage: "❌ Failed to download files...",
    async action(updateMessage) {
      updateMessage("Some magic is happening... This may take a while...");
      const filesToFetch = replaceAll
        ? [...filesToDownload, ...filesToReplace]
        : filesToDownload;
      await cloneAndCopyFiles(
        filesToFetch.filter(Boolean),
        targetDir,
        replaceAll,
        tempCloneRepo,
        tempRepoDir,
      );
    },
  });
}

// Main function to check and download files
export const askCheckAndDownloadFiles = async (
  targetDir: string,
  projectName: string,
): Promise<void> => {
  const missingFiles: string[] = [];
  const existingFiles: string[] = [];

  relinka(
    "info-verbose",
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
    relinka(
      "info-verbose",
      `The following files are missing in ${targetDir}: ${missingFiles.join(", ")}`,
    );

    // Ask user for the categories to download
    const shouldAskAboutCategories = false;
    let filesToDownload: string[] = [];

    if (shouldAskAboutCategories) {
      const categoriesToDownload = await multiselectPrompt({
        title: "Select the file categories you want to download:",
        titleColor: "cyanBright",
        options: Object.keys(fileCategories).map((category) => ({
          label: category,
          value: category,
          hint: category,
        })),
      });

      filesToDownload = categoriesToDownload
        .flatMap((category) => fileCategories[category] || [])
        .filter(Boolean);
    }

    const cwd = getCurrentWorkingDirectory();
    const tempCloneRepo = "https://github.com/blefnk/relivator";

    // TODO: maybe we should reimplement this in a better way
    const tempRepoDir = path.resolve(cwd, `../${FILE_PATHS.tempRepoClone}`);
    relinka("info-verbose", `⚙️  tempRepoDir set to ${tempRepoDir}`);

    // Handle conflicts for already existing files
    const shouldAskAboutReplacingFiles = false;
    let replaceAll = false;

    if (existingFiles.length > 0) {
      if (shouldAskAboutReplacingFiles) {
        replaceAll = await confirmPrompt({
          defaultValue: true,
          title:
            "Some files already exist. Do you want to replace all existing files? (N opens Conflict Management menu)",
          titleColor: "cyanBright",
        });
      }

      if (!replaceAll) {
        const shouldAskAboutFilesToReplace = false;
        let filesToReplace: string[] = [];

        if (shouldAskAboutFilesToReplace) {
          // Select the files to replace
          filesToReplace = await multiselectPrompt({
            title: "Select the files you want to replace:",
            titleColor: "cyanBright",
            options: existingFiles.map((file) => ({
              label: file,
              value: file,
              hint: file,
            })),
          });
        }

        // Download files with the selected ones to replace
        await downloadFiles(
          filesToDownload,
          filesToReplace,
          targetDir,
          false,
          tempCloneRepo,
          tempRepoDir,
        );
      } else {
        // Replace all existing files
        await downloadFiles(
          filesToDownload,
          [],
          targetDir,
          true,
          tempCloneRepo,
          tempRepoDir,
        );
      }
    } else {
      // No conflicts, just download the files
      await downloadFiles(
        filesToDownload,
        [],
        targetDir,
        false,
        tempCloneRepo,
        tempRepoDir,
      );
    }
  } else {
    relinka(
      "success",
      `All required files are present in ${targetDir}. Codemod is finished.`,
    );
  }
};
