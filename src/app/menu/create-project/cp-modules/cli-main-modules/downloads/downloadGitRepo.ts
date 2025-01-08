import { selectPrompt } from "@reliverse/prompts";
import fs from "fs-extra";
import path from "pathe";
import { simpleGit } from "simple-git";

import {
  relinka,
  throwError,
} from "~/app/menu/create-project/cp-modules/cli-main-modules/handlers/logger.js";
import { getCurrentWorkingDirectory } from "~/app/menu/create-project/cp-modules/cli-main-modules/handlers/terminal.js";

export async function downloadGitRepo(
  name: string,
  template: string,
  isDev: boolean,
): Promise<string | undefined> {
  try {
    const cwd = getCurrentWorkingDirectory();

    // Create target directory based on provided testsRuntimePath or default location
    const targetDir = isDev
      ? path.join(cwd, "tests-runtime", name)
      : path.join(cwd, name);

    relinka("info-verbose", `Installing template in: ${targetDir}`);

    // Create target directory if it doesn't exist
    await fs.ensureDir(targetDir);

    // Check if directory contains only .reliverse
    const files = await fs.readdir(targetDir);
    const hasOnlyReliverseConfig =
      files.length === 1 && files[0] === ".reliverse";

    // If directory is not empty and doesn't contain only .reliverse, throw error
    if (files.length > 0 && !hasOnlyReliverseConfig) {
      throw new Error(
        `Target directory ${targetDir} is not empty and contains files other than .reliverse`,
      );
    }

    // Temporarily move .reliverse if it exists
    const parentDir = path.dirname(targetDir);
    const tempReliverseConfigPath = path.join(parentDir, ".reliverse");

    if (hasOnlyReliverseConfig) {
      // Check if .reliverse already exists in parent directory
      if (await fs.pathExists(tempReliverseConfigPath)) {
        const choice = await selectPrompt({
          title:
            ".reliverse already exists in parent directory. What would you like to do?",
          options: [
            { value: "delete", label: "Delete existing file" },
            { value: "backup", label: "Create backup" },
          ],
        });

        if (choice === "delete") {
          await fs.remove(tempReliverseConfigPath);
        } else {
          // Find appropriate backup name
          let backupPath = path.join(parentDir, ".reliverse.bak");
          let iteration = 1;
          while (await fs.pathExists(backupPath)) {
            backupPath = path.join(parentDir, `.reliverse_${iteration}.bak`);
            iteration++;
          }
          await fs.move(tempReliverseConfigPath, backupPath);
        }
      }

      await fs.move(
        path.join(targetDir, ".reliverse"),
        tempReliverseConfigPath,
      );
      await fs.remove(targetDir);
      await fs.ensureDir(targetDir);
    }

    try {
      const git = simpleGit();
      const repoUrl = `https://github.com/${template}.git`;

      await git.clone(repoUrl, targetDir);

      // Restore .reliverse if it was moved
      if (hasOnlyReliverseConfig) {
        await fs.move(
          tempReliverseConfigPath,
          path.join(targetDir, ".reliverse"),
          { overwrite: true },
        );
      }

      relinka("success-verbose", `${template} was downloaded to ${targetDir}.`);
      return targetDir;
    } catch (error) {
      // Restore .reliverse if operation failed
      if (
        hasOnlyReliverseConfig &&
        (await fs.pathExists(tempReliverseConfigPath))
      ) {
        await fs.ensureDir(targetDir);
        await fs.move(
          tempReliverseConfigPath,
          path.join(targetDir, ".reliverse"),
          { overwrite: true },
        );
      }
      throw error;
    }
  } catch (error) {
    throwError(error);
    return undefined;
  }
}
