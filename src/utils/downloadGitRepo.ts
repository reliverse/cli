import { downloadTemplate } from "giget";
import path from "pathe";
import type { GitOption } from "~/menu/modules/08-askGitInitialization.js";

import { handleError, verbose } from "~/utils/console.js";
import { getCurrentWorkingDirectory } from "~/utils/fs.js";
import { initializeGitRepository } from "~/utils/git.js";
import { isDev } from "~/app.js";

export async function downloadGitRepo(
  name: string,
  template: string,
  deps: boolean,
  gitOption: GitOption,
): Promise<string | undefined> {
  try {
    const cwd = getCurrentWorkingDirectory();
    const targetDir = path.join(cwd, isDev ? ".." : "", name);

    verbose("info", `Installing template in: ${targetDir}`);

    const { dir, source } = await downloadTemplate(`github:${template}`, {
      dir: targetDir,
      install: deps,
    });

    verbose("success", `${source} was downloaded to ${dir}.`);

    gitOption && (await initializeGitRepository(targetDir, gitOption));

    return dir;
  } catch (error) {
    handleError(error);
  }
}
