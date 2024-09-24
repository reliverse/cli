import type { SimpleGit } from "simple-git";

import { confirm } from "@inquirer/prompts";
import { consola } from "consola";
import fs from "fs-extra";
import path from "pathe";
import { simpleGit } from "simple-git";

import {
  fileCategories,
  GITHUB_REPO_URL,
  TEMP_CLONE_DIR,
  TEMP_GITHUB_REPO_NAME,
} from "./fileCategories";

// Type definition for fileCategories
type FileCategories = Record<string, string[]>;

// Function to clone the repository and copy missing files
export const cloneAndCopyFiles = async (
  filesToDownload: string[],
  targetDir: string,
  replaceAll: boolean,
): Promise<void> => {
  try {
    const git: SimpleGit = simpleGit();

    consola.info(
      `We will use the following template (to provide to you the required files): ${GITHUB_REPO_URL}`,
    );
    await git.clone(GITHUB_REPO_URL, TEMP_CLONE_DIR, ["--depth", "1"]);
    consola.success(
      "Temporary repository cloned successfully. We take some files from here and removing it.",
    );

    // Group files by category
    const filesByCategory: FileCategories = {};

    // Find the category each file belongs to
    for (const category in fileCategories) {
      const filesInCategory = fileCategories[category]?.filter((file) =>
        filesToDownload.includes(file),
      );

      if (filesInCategory && filesInCategory.length > 0) {
        filesByCategory[category] = filesInCategory;
      }
    }

    // Copy files and display by category
    for (const category in filesByCategory) {
      const files = filesByCategory[category];

      if (files) {
        for (const fileName of files) {
          const sourcePath = path.join(TEMP_CLONE_DIR, fileName);
          const destPath = path.join(targetDir, fileName);

          if (fs.existsSync(destPath) && !replaceAll) {
            consola.warn(`${fileName} already exists in ${targetDir}.`);

            // Ask the user if they want to replace this specific file
            const shouldReplace = await confirm({
              default: false,
              message: `Do you want to replace ${fileName}?`,
            });

            if (shouldReplace) {
              await fs.copy(sourcePath, destPath);
              consola.success(`${fileName} replaced.`);
            } else {
              consola.info(`${fileName} was not replaced.`);
            }
          } else {
            await fs.copy(sourcePath, destPath);
          }
        }

        // After all files in the category have been copied or replaced
        consola.success(`* Files of '${category}' category was copied.`);
      }
    }

    // Clean up the temporary clone
    await fs.remove(TEMP_CLONE_DIR);
    consola.success(`Temporary '${TEMP_GITHUB_REPO_NAME}' clone removed.`);
  } catch (error) {
    if (error instanceof Error) {
      consola.error(`Error: ${error.message}`);
    } else {
      consola.error("An unknown error occurred.");
    }
  }
};
