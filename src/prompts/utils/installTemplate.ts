import { consola } from "consola";
import { downloadTemplate } from "giget";
import path from "node:path";

import { choosePackageManager } from "~/prompts/utils/choosePackageManager";
import { getCurrentWorkingDirectory } from "~/prompts/utils/fs";
import { initializeGitRepository } from "~/prompts/utils/git";
import { DEBUG, isDevelopment } from "~/settings";

export async function installTemplate(
  name: string,
  template: string,
  deps: boolean,
  gitOption: string,
): Promise<void> {
  try {
    const cwd = getCurrentWorkingDirectory();
    const targetDir = isDevelopment
      ? path.join(cwd, "..", name)
      : path.join(cwd, name);

    DEBUG.enableVerboseLogging &&
      consola.log(`Installing template in: ${targetDir}`);

    let source: string | undefined;
    let dir: string | undefined;

    try {
      const result = await downloadTemplate(`github:${template}`, {
        dir: targetDir,
        install: deps,
      });

      source = result.source;
      dir = result.dir;

      DEBUG.enableVerboseLogging &&
        consola.success(`${source} was downloaded to ${dir}.`);
    } catch (error) {
      if (error instanceof Error) {
        consola.error(
          `🤔 Failed to set up the project: ${error.message}`,
          error,
        );
      } else {
        consola.error("🤔 An unknown error occurred.");
      }

      process.exit(1);
    }

    if (gitOption) {
      await initializeGitRepository(targetDir, gitOption);
    }
  } catch (error) {
    if (error instanceof Error) {
      consola.error(`🤔 Failed to set up the project: ${error.message}`);
    } else {
      consola.error("🤔 An unknown error occurred.");
    }

    process.exit(1);
  }
}
