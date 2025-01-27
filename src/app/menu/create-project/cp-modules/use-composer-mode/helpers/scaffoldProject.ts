import * as p from "@clack/prompts";
import { relinka } from "@reliverse/prompts";
import { re } from "@reliverse/relico";
import fs from "fs-extra";
import { globby } from "globby";
import ora from "ora";
import path from "pathe";

import type { InstallerOptions } from "~/app/menu/create-project/cp-modules/use-composer-mode/opts.js";

import { PKG_ROOT } from "~/app/constants.js";

/**
 * Renames all -tsx.txt files back to .tsx in the specified directory and its subdirectories.
 */
async function renameTsxFiles(dir: string): Promise<void> {
  try {
    const files = await globby("**/*-tsx.txt", {
      cwd: dir,
      absolute: true,
    });

    for (const filePath of files) {
      const newPath = filePath.replace(/-tsx\.txt$/, ".tsx");
      await fs.rename(filePath, newPath);
    }
  } catch (error) {
    relinka(
      "error",
      "Error renaming -tsx.txt files:",
      error instanceof Error ? error.message : String(error),
    );
  }
}

// This bootstraps the base Next.js application
export const scaffoldProject = async ({
  projectName,
  projectDir,
  pkgManager,
  noInstall,
}: InstallerOptions) => {
  const srcDir = path.join(PKG_ROOT, "template/base");

  if (!noInstall) {
    relinka("info", `\nUsing: ${re.bold(re.cyan(pkgManager))}\n`);
  } else {
    relinka("info", "");
  }

  const spinner = ora(`Scaffolding in: ${projectDir}...\n`).start();

  if (fs.existsSync(projectDir)) {
    if (fs.readdirSync(projectDir).length === 0) {
      if (projectName !== ".")
        spinner.info(
          `${re.bold(re.cyan(projectName))} exists but is empty, continuing...\n`,
        );
    } else {
      spinner.stopAndPersist();
      const overwriteDir = await p.select({
        message: `${re.redBright("Warning:")} ${re.bold(
          re.cyan(projectName),
        )} already exists and isn't empty. How would you like to proceed?`,
        options: [
          {
            label: "Abort installation (recommended)",
            value: "abort",
          },
          {
            label: "Clear the directory and continue installation",
            value: "clear",
          },
          {
            label: "Continue installation and overwrite conflicting files",
            value: "overwrite",
          },
        ],
        initialValue: "abort",
      });
      if (overwriteDir === "abort") {
        spinner.fail("Aborting installation...");
        process.exit(1);
      }

      const overwriteAction =
        overwriteDir === "clear"
          ? "clear the directory"
          : "overwrite conflicting files";

      const confirmOverwriteDir = await p.confirm({
        message: `Are you sure you want to ${overwriteAction}?`,
        initialValue: false,
      });

      if (!confirmOverwriteDir) {
        spinner.fail("Aborting installation...");
        process.exit(1);
      }

      if (overwriteDir === "clear") {
        spinner.info(
          `Emptying ${re.bold(re.cyan(projectName))} and creating Reliverse app...\n`,
        );
        fs.emptyDirSync(projectDir);
      }
    }
  }

  spinner.start();

  fs.copySync(srcDir, projectDir);
  fs.renameSync(
    path.join(projectDir, "_gitignore"),
    path.join(projectDir, ".gitignore"),
  );

  // Convert any -tsx.txt files back to .tsx
  await renameTsxFiles(projectDir);

  const scaffoldedName =
    projectName === "." ? "App" : re.bold(re.cyan(projectName));

  spinner.succeed(
    `${scaffoldedName} ${re.green("scaffolded successfully!")}\n`,
  );
};
