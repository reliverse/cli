import { downloadTemplate } from "giget";
import path from "pathe";
import type { GitOption } from "~/menu/08-askGitInitialization";

import { handleError, verbose } from "~/utils/console";
import { getCurrentWorkingDirectory } from "~/utils/fs";
import { initializeGitRepository } from "~/utils/git";
import { isDev } from "~/app";

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
