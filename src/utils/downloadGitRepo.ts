import { selectPrompt } from "@reliverse/prompts";
import fs from "fs-extra";
import path from "pathe";
import { simpleGit } from "simple-git";

import { relinka, throwError } from "~/utils/console.js";
import { getCurrentWorkingDirectory } from "~/utils/fs.js";

export async function downloadGitRepo(
  name: string,
  template: string,
  isDev: boolean,
): Promise<string | undefined> {
  try {
    const cwd = getCurrentWorkingDirectory();

    // Create target directory directly in cwd (or tests-runtime for dev mode)
    const targetDir = isDev
      ? path.join(cwd, "tests-runtime", name)
      : path.join(cwd, name);

    relinka("info-verbose", `Installing template in: ${targetDir}`);

    // Create target directory if it doesn't exist
    await fs.ensureDir(targetDir);

    // Check if directory contains only reliverse.json
    const files = await fs.readdir(targetDir);
    const hasOnlyReliverserules =
      files.length === 1 && files[0] === "reliverse.json";

    // If directory is not empty and doesn't contain only reliverse.json, throw error
    if (files.length > 0 && !hasOnlyReliverserules) {
      throw new Error(
        `Target directory ${targetDir} is not empty and contains files other than reliverse.json`,
      );
    }

    // Temporarily move reliverse.json if it exists
    const parentDir = path.dirname(targetDir);
    const tempReliverserulesPath = path.join(parentDir, "reliverse.json");

    if (hasOnlyReliverserules) {
      // Check if reliverse.json already exists in parent directory
      if (await fs.pathExists(tempReliverserulesPath)) {
        const choice = await selectPrompt({
          title:
            "reliverse.json already exists in parent directory. What would you like to do?",
          options: [
            { value: "delete", label: "Delete existing file" },
            { value: "backup", label: "Create backup" },
          ],
        });

        if (choice === "delete") {
          await fs.remove(tempReliverserulesPath);
        } else {
          // Find appropriate backup name
          let backupPath = path.join(parentDir, "reliverse.json.bak");
          let iteration = 1;
          while (await fs.pathExists(backupPath)) {
            backupPath = path.join(
              parentDir,
              `reliverse.json_${iteration}.bak`,
            );
            iteration++;
          }
          await fs.move(tempReliverserulesPath, backupPath);
        }
      }

      await fs.move(
        path.join(targetDir, "reliverse.json"),
        tempReliverserulesPath,
      );
      await fs.remove(targetDir);
      await fs.ensureDir(targetDir);
    }

    try {
      const git = simpleGit();
      const repoUrl = `https://github.com/${template}.git`;

      await git.clone(repoUrl, targetDir);

      // Restore reliverse.json if it was moved
      if (hasOnlyReliverserules) {
        await fs.move(
          tempReliverserulesPath,
          path.join(targetDir, "reliverse.json"),
          { overwrite: true },
        );
      }

      relinka("success-verbose", `${template} was downloaded to ${targetDir}.`);
      return targetDir;
    } catch (error) {
      // Restore reliverse.json if operation failed
      if (
        hasOnlyReliverserules &&
        (await fs.pathExists(tempReliverserulesPath))
      ) {
        await fs.ensureDir(targetDir);
        await fs.move(
          tempReliverserulesPath,
          path.join(targetDir, "reliverse.json"),
          { overwrite: true },
        );
      }
      throw error;
    }
  } catch (error) {
    throwError(error);
  }
}
