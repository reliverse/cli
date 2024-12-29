import * as p from "@clack/prompts";
import fs from "fs-extra";
import ora from "ora";
import path from "pathe";
import pc from "picocolors";

import { PKG_ROOT } from "~/app/db/constants.js";
import { relinka } from "~/utils/console.js";

import type { InstallerOptions } from "../opts.js";

// This bootstraps the base Next.js application
export const scaffoldProject = async ({
  projectName,
  projectDir,
  pkgManager,
  noInstall,
}: InstallerOptions) => {
  const srcDir = path.join(PKG_ROOT, "template/base");

  if (!noInstall) {
    relinka("info", `\nUsing: ${pc.bold(pc.cyan(pkgManager))}\n`);
  } else {
    relinka("info", "");
  }

  const spinner = ora(`Scaffolding in: ${projectDir}...\n`).start();

  if (fs.existsSync(projectDir)) {
    if (fs.readdirSync(projectDir).length === 0) {
      if (projectName !== ".")
        spinner.info(
          `${pc.bold(pc.cyan(projectName))} exists but is empty, continuing...\n`,
        );
    } else {
      spinner.stopAndPersist();
      const overwriteDir = await p.select({
        message: `${pc.redBright("Warning:")} ${pc.bold(
          pc.cyan(projectName),
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
          `Emptying ${pc.bold(pc.cyan(projectName))} and creating Reliverse app...\n`,
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

  const scaffoldedName =
    projectName === "." ? "App" : pc.bold(pc.cyan(projectName));

  spinner.succeed(
    `${scaffoldedName} ${pc.green("scaffolded successfully!")}\n`,
  );
};
