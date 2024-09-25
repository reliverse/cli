import type { SimpleGit } from "simple-git";

import { confirm } from "@inquirer/prompts";
import { consola } from "consola";
import fs from "fs-extra";
import path from "pathe";
import { simpleGit } from "simple-git";

import {
  fileCategories,
  GITHUB_REPO_URL,
  TEMP_GITHUB_REPO_NAME,
} from "./fileCategories";

// Type definition for fileCategories
type FileCategories = Record<string, string[]>;

export async function cloneAndCopyFiles(
  filesToDownload: string[],
  targetDir: string,
  overwrite: boolean,
  repoUrl: string,
  tempRepoDir: string,
): Promise<void> {
  // Logic for cloning to the specified tempRepoDir instead of defaulting to cwd
  // Clone the repository into tempRepoDir
  consola.info(`Cloning from ${repoUrl} into ${tempRepoDir}...`);

  // const TEMP_CLONE_DIR = "temp-repo-clone";

  try {
    const git = simpleGit();

    consola.info(`Cloning from ${repoUrl}...`);
    await git.clone(repoUrl, tempRepoDir, ["--depth", "1"]);
    consola.success("Temporary repository cloned successfully.");

    for (const fileName of filesToDownload) {
      const sourcePath = path.join(tempRepoDir, fileName);
      const destPath = path.join(targetDir, fileName);

      if ((await fs.pathExists(destPath)) && !overwrite) {
        consola.warn(`${fileName} already exists in ${targetDir}.`);
      } else {
        await fs.copy(sourcePath, destPath);
        consola.success(`${fileName} copied.`);
      }
    }

    // Clean up the temporary clone directory
    await fs.remove(tempRepoDir);
    consola.info("Temporary clone removed.");
  } catch (error) {
    consola.error(`Error during file cloning: ${error}`);
  }
}
