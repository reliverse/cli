import { relinka } from "@reliverse/prompts";
import { re } from "@reliverse/relico";
import { execa } from "execa";
import ora, { type Ora } from "ora";

import {
  getUserPkgManager,
  type PackageManager,
} from "~/utils/dependencies/getUserPkgManager.js";
import { execaSpinner } from "~/utils/execaSpinner.js";

const runInstallCommand = async (
  pkgManager: PackageManager,
  projectDir: string,
): Promise<Ora | null> => {
  switch (pkgManager) {
    // When using npm, inherit the stderr stream so that the progress bar is shown
    case "npm":
      await execa(pkgManager, ["install"], {
        cwd: projectDir,
        stderr: "inherit",
      });
      return null;

    // When using yarn or pnpm, use the stdout stream and ora spinner to show the progress
    case "pnpm":
      return execaSpinner(projectDir, pkgManager, {
        args: ["install"],
        spinnerText: "Installing dependencies with pnpm...",
        successText: re.green(
          "Successfully installed dependencies with pnpm!\n",
        ),
        onDataHandle: (spinner) => (data) => {
          const text = data.toString();
          if (text.includes("Progress")) {
            spinner.text = text.includes("|")
              ? (text.split(" | ")[1] ?? "")
              : text;
          }
        },
      });

    case "yarn":
      return execaSpinner(projectDir, pkgManager, {
        args: ["install"],
        spinnerText: "Installing dependencies with yarn...",
        successText: re.green(
          "Successfully installed dependencies with yarn!\n",
        ),
        onDataHandle: (spinner) => (data) => {
          spinner.text = data.toString();
        },
      });

    // When using bun, the stdout stream is ignored and the spinner is shown
    case "bun":
      return execaSpinner(projectDir, pkgManager, {
        args: ["install"],
        stdout: "ignore",
        spinnerText: "Installing dependencies with bun...",
        successText: re.green(
          "Successfully installed dependencies with bun!\n",
        ),
      });
  }
};

export const installDependencies = async ({
  projectDir,
}: {
  projectDir: string;
}) => {
  relinka("info", "Installing dependencies...");
  const pkgInfo = await getUserPkgManager();
  const pkgManager = pkgInfo.packageManager;

  const installSpinner = await runInstallCommand(pkgManager, projectDir);

  // If the spinner was used to show the progress, use succeed method on it
  // If not (npm case), use the succeed on a new spinner
  if (!installSpinner) {
    ora().succeed(re.green("Successfully installed dependencies!\n"));
  }
};
