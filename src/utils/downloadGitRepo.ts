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

    const git = simpleGit();
    const repoUrl = `https://github.com/${template}.git`;

    await git.clone(repoUrl, targetDir);

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
    throwError(error);
  }
}
