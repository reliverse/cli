import { selectPrompt } from "@reliverse/prompts";
import fs from "fs-extra";
import os from "os";
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

    // Determine initial target directory based on isDev flag
    let targetDir = isDev
      ? path.join(cwd, "tests-runtime", name)
      : path.join(os.homedir(), ".reliverse", "projects", name);

    relinka("info-verbose", `Installing template in: ${targetDir}`);

    // Create target directory if it doesn't exist
    await fs.ensureDir(targetDir);

    // Check if directory contains only .reliverserules
    const files = await fs.readdir(targetDir);
    const hasOnlyReliverserules =
      files.length === 1 && files[0] === ".reliverserules";

    // If directory is not empty and doesn't contain only .reliverserules, throw error
    if (files.length > 0 && !hasOnlyReliverserules) {
      throw new Error(
        `Target directory ${targetDir} is not empty and contains files other than .reliverserules`,
      );
    }

    // Temporarily move .reliverserules if it exists
    const parentDir = path.dirname(targetDir);
    const tempReliverserulesPath = path.join(parentDir, ".reliverserules");

    if (hasOnlyReliverserules) {
      // Check if .reliverserules already exists in parent directory
      if (await fs.pathExists(tempReliverserulesPath)) {
        const choice = await selectPrompt({
          title:
            ".reliverserules already exists in parent directory. What would you like to do?",
          options: [
            { value: "delete", label: "Delete existing file" },
            { value: "backup", label: "Create backup" },
          ],
        });

        if (choice === "delete") {
          await fs.remove(tempReliverserulesPath);
        } else {
          // Find appropriate backup name
          let backupPath = path.join(parentDir, ".reliverserules.bak");
          let iteration = 1;
          while (await fs.pathExists(backupPath)) {
            backupPath = path.join(
              parentDir,
              `.reliverserules_${iteration}.bak`,
            );
            iteration++;
          }
          await fs.move(tempReliverserulesPath, backupPath);
        }
      }

      await fs.move(
        path.join(targetDir, ".reliverserules"),
        tempReliverserulesPath,
      );
      await fs.remove(targetDir);
      await fs.ensureDir(targetDir);
    }

    try {
      const git = simpleGit();
      const repoUrl = `https://github.com/${template}.git`;

      await git.clone(repoUrl, targetDir);

      // Restore .reliverserules if it was moved
      if (hasOnlyReliverserules) {
        await fs.move(
          tempReliverserulesPath,
          path.join(targetDir, ".reliverserules"),
          { overwrite: true },
        );
      }

      relinka("success-verbose", `${template} was downloaded to ${targetDir}.`);

      // If not in dev mode, move project to final destination (cwd)
      if (!isDev) {
        const finalDir = path.join(cwd, name);
        await fs.move(targetDir, finalDir);
        targetDir = finalDir;
        relinka(
          "success-verbose",
          `Project moved to final location: ${finalDir}`,
        );
      }

      return targetDir;
    } catch (error) {
      // Restore .reliverserules if operation failed
      if (
        hasOnlyReliverserules &&
        (await fs.pathExists(tempReliverserulesPath))
      ) {
        await fs.ensureDir(targetDir);
        await fs.move(
          tempReliverserulesPath,
          path.join(targetDir, ".reliverserules"),
          { overwrite: true },
        );
      }
      throw error;
    }
  } catch (error) {
    throwError(error);
  }
}
