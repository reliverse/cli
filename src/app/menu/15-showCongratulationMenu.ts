import { checkbox, multiselectPrompt } from "@reliverse/prompts";
import { relinka } from "@reliverse/relinka";
import { execa } from "execa";
import fs from "fs-extra";
import path from "pathe";

import { DEBUG, FILE_PATHS } from "~/app/data/constants.js";
import { choosePackageManager } from "~/utils/choosePackageManager.js";
import { isVSCodeInstalled } from "~/utils/isAppInstalled.js";

export async function showCongratulationMenu(
  targetDir: string,
  deps: boolean,
  source: string,
  dir: string,
  isDev: boolean,
) {
  const cwd = process.cwd();
  const pkgManager = await choosePackageManager(cwd);

  relinka.info("");
  relinka.success("🤘 Project created successfully!");
  relinka.info("✨ Next steps to get started:");
  relinka.info(`- Open the project: cd ${targetDir}`);

  if (!deps) {
    relinka.info(`- Install dependencies manually: ${pkgManager} i`);
  }

  relinka.info(`- Apply linting and formatting: ${pkgManager} appts`);
  relinka.info(`- Run the project: ${pkgManager} dev`);
  relinka.info("");
  relinka.success(`🎉 ${source} was successfully installed to ${dir}.`);
  relinka.info(`- If you have VSCode installed, run: code ${targetDir}`);

  relinka.info("");

  const vscodeInstalled = isVSCodeInstalled();

  const nextActions = await multiselectPrompt({
    title: "What would you like to do next?",
    options: [
      {
        label: "Close @reliverse/cli",
        value: "close",
        hint: "Close @reliverse/cli",
      },
      ...(DEBUG.alphaFeaturesEnabled
        ? [
            {
              label: "Open Documentation",
              value: "docs",
              hint: "Open Reliverse Documentation",
            },
          ]
        : []),
      ...(DEBUG.alphaFeaturesEnabled
        ? [
            {
              label: "Join Discord",
              value: "discord",
              hint: "Join Reliverse Discord Server",
            },
          ]
        : []),
      ...(vscodeInstalled && DEBUG.alphaFeaturesEnabled
        ? [
            {
              label: "Open in VSCode",
              value: "vscode",
              hint: "Open Project in VSCode",
            },
          ]
        : []),
      {
        label: "Clean Up",
        value: "removeTemp",
        hint: "Remove temp-repo-clone folder",
      },
    ],
  });

  for (const action of nextActions) {
    if (action === "docs") {
      relinka.info("Opening Reliverse Documentation...");
      try {
        await execa("firefox", ["https://reliverse.org/docs"]);
      } catch (error) {
        relinka.error("Error opening documentation:", error);
      }
    } else if (action === "discord") {
      relinka.info("Joining Reliverse Discord server...");
      try {
        await execa("firefox", ["https://discord.gg/Pb8uKbwpsJ"]);
      } catch (error) {
        relinka.error("Error opening Discord:", error);
      }
    } else if (action === "vscode") {
      relinka.info("Opening the project in VSCode...");
      try {
        await execa("code", [targetDir]);
      } catch (error) {
        relinka.error("Error opening VSCode:", error);
      }
    } else if (action === "removeTemp") {
      const tempRepoDir = isDev
        ? path.join(cwd, "..", FILE_PATHS.tempRepoClone)
        : path.join(cwd, FILE_PATHS.tempRepoClone);

      if (await fs.pathExists(tempRepoDir)) {
        await fs.remove(tempRepoDir);
        relinka.success("Temporary clone folder removed.");
      } else {
        relinka.warn("Temporary clone folder not found.");
      }
    }
  }

  relinka.success(
    "👋 Closing the CLI... Thanks for using Reliverse! See you next time!\n",
  );
  process.exit(0);
}
