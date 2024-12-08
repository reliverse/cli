import { msg } from "@reliverse/prompts";
import relinka from "@reliverse/relinka";
import path from "pathe";
import pc from "picocolors";
import { simpleGit } from "simple-git";

import type { GitOption } from "~/app/menu/08-askGitInitialization.js";

import { handleError, verbose } from "~/utils/console.js";
import { getCurrentWorkingDirectory } from "~/utils/fs.js";
import { initializeGitRepository } from "~/utils/git.js";

export async function downloadGitRepo(
  name: string,
  template: string,
  isDev: boolean,
): Promise<string | undefined> {
  try {
    isDev
      ? relinka.info(pc.dim(" ✨ Downloading initial files (dev mode)..."))
      : relinka.info(pc.dim(" ✨ Downloading initial files..."));

    msg({
      type: "M_MIDDLE",
    });

    const cwd = getCurrentWorkingDirectory();
    const targetDir = path.join(cwd, isDev ? ".." : "", name);

    verbose("info", `Installing template in: ${targetDir}`);

    const git = simpleGit();
    const repoUrl = `https://github.com/${template}.git`;

    await git.clone(repoUrl, targetDir);

    verbose("success", `${template} was downloaded to ${targetDir}.`);

    return targetDir;
  } catch (error) {
    handleError(error);
  }
}
