import { consola } from "consola";
import { downloadTemplate } from "giget";
import path from "node:path";

import { getCurrentWorkingDirectory } from "~/utils/fs";
import { initializeGitRepository } from "~/utils/git";
import { choosePackageManager } from "~/utils/packageManager";

const args = process.argv.slice(2);
const isDevelopment = args.includes("--dev");

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

      consola.success(`🎉 ${source} was successfully installed to ${dir}.`);
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

    consola.info("✨ Next steps to get started:");
    consola.info(`- Open the project: cd ${targetDir}`);

    if (!deps) {
      consola.info("- Install dependencies manually: npx nypm i");
    }

    if (gitOption) {
      await initializeGitRepository(targetDir, gitOption);
    }

    const pkgManager = await choosePackageManager(cwd);

    consola.info(`- Apply linting and formatting: ${pkgManager} appts`);
    consola.info(`- Run the project: ${pkgManager} dev`);
    consola.info("");
  } catch (error) {
    if (error instanceof Error) {
      consola.error(`🤔 Failed to set up the project: ${error.message}`);
    } else {
      consola.error("🤔 An unknown error occurred.");
    }

    process.exit(1);
  }
}
