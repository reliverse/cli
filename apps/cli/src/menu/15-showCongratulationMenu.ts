import { checkbox } from "@inquirer/prompts";
import { consola } from "consola";
import fs from "fs-extra";
import path from "pathe";
import { execa } from "execa";

import { choosePackageManager } from "~/utils/choosePackageManager";
import { isVSCodeInstalled } from "~/utils/isAppInstalled";
import { DEBUG, FILE_PATHS, isDev } from "~/app";

export async function showCongratulationMenu(
  targetDir: string,
  deps: boolean,
  source: string,
  dir: string,
) {
  const cwd = process.cwd();
  const pkgManager = await choosePackageManager(cwd);

  console.info("");
  consola.success("🤘 Project created successfully!");
  consola.info("✨ Next steps to get started:");
  consola.info(`- Open the project: cd ${targetDir}`);

  if (!deps) {
    consola.info(`- Install dependencies manually: ${pkgManager} i`);
  }

  consola.info(`- Apply linting and formatting: ${pkgManager} appts`);
  consola.info(`- Run the project: ${pkgManager} dev`);
  consola.info("");
  consola.success(`🎉 ${source} was successfully installed to ${dir}.`);
  consola.info(`- If you have VSCode installed, run: code ${targetDir}`);

  console.info("");

  const vscodeInstalled = isVSCodeInstalled();

  const nextActions = await checkbox({
    choices: [
      { name: "Close Reliverse CLI", checked: true, value: "close" },
      ...(DEBUG.alphaFeaturesEnabled
        ? [{ name: "Open Reliverse Documentation", value: "docs" }]
        : []),
      ...(DEBUG.alphaFeaturesEnabled
        ? [{ name: "Join Reliverse Discord Server", value: "discord" }]
        : []),
      ...(vscodeInstalled && DEBUG.alphaFeaturesEnabled
        ? [{ name: "Open Project in VSCode", value: "vscode" }]
        : []),
      {
        name: "Remove temp-repo-clone folder",
        checked: true,
        value: "removeTemp",
      },
    ],
    message: "What would you like to do next?",
  });

  for (const action of nextActions) {
    if (action === "docs") {
      consola.info("Opening Reliverse Documentation...");
      try {
        await execa("firefox", ["https://reliverse.org/docs"]);
      } catch (error) {
        consola.error("Error opening documentation:", error);
      }
    } else if (action === "discord") {
      consola.info("Joining Reliverse Discord server...");
      try {
        await execa("firefox", ["https://discord.gg/Pb8uKbwpsJ"]);
      } catch (error) {
        consola.error("Error opening Discord:", error);
      }
    } else if (action === "vscode") {
      consola.info("Opening the project in VSCode...");
      try {
        await execa("code", [targetDir]);
      } catch (error) {
        consola.error("Error opening VSCode:", error);
      }
    } else if (action === "removeTemp") {
      const tempRepoDir = isDev
        ? path.join(cwd, "..", FILE_PATHS.tempRepoClone)
        : path.join(cwd, FILE_PATHS.tempRepoClone);

      if (await fs.pathExists(tempRepoDir)) {
        await fs.remove(tempRepoDir);
        consola.success("Temporary clone folder removed.");
      } else {
        consola.warn("Temporary clone folder not found.");
      }
    }
  }

  consola.success(
    "👋 Closing the CLI... Thanks for using Reliverse! See you next time!\n",
  );
  process.exit(0);
}
