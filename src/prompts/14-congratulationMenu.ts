import { checkbox } from "@inquirer/prompts";
import { consola } from "consola";
import fs from "fs-extra";
import path from "node:path";
import open, { openApp } from "open"; // Use original "open" library

import { choosePackageManager } from "~/prompts/utils/choosePackageManager";
import { isVSCodeInstalled } from "~/prompts/utils/isAppInstalled";
import { DEBUG, FILE_PATHS, isDevelopment } from "~/settings";

// Function to display the final congratulatory message and next steps
export async function congratulationMenu(
  targetDir: string,
  deps: boolean,
  source: string,
  dir: string,
) {
  const cwd = process.cwd();
  const pkgManager = await choosePackageManager(cwd);

  // Next steps for the user
  console.info("");
  consola.success("🤘 Project created successfully!");
  consola.info("✨ Next steps to get started:");
  consola.info(`- Open the project: cd ${targetDir}`);

  if (!deps) {
    consola.info("- Install dependencies manually: npx nypm i");
  }

  consola.info(`- Apply linting and formatting: ${pkgManager} appts`);
  consola.info(`- Run the project: ${pkgManager} dev`);
  consola.info("");
  consola.success(`🎉 ${source} was successfully installed to ${dir}.`);
  consola.info(`👉 If you have VSCode installed, run: code ${targetDir}`);

  console.info("");

  const vscodeInstalled = isVSCodeInstalled();

  // Checkbox prompt for multiple actions
  const nextActions = await checkbox({
    choices: [
      { name: "Close Reliverse CLI", checked: true, value: "close" }, // Default checked
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
      }, // Default checked
    ],
    message: "What would you like to do next?",
  });

  // Execute selected actions
  for (const action of nextActions) {
    if (action === "docs") {
      consola.info("Opening Reliverse Documentation...");
      try {
        await open("https://reliverse.org/docs", {
          app: {
            name: ["firefox", "chrome", "msedge"],
          },
        });
      } catch (error) {
        consola.error("Error opening documentation:", error);
      }
    } else if (action === "discord") {
      consola.info("Joining Reliverse Discord server...");
      try {
        await open("https://discord.gg/Pb8uKbwpsJ", {
          app: {
            name: ["firefox", "chrome", "msedge"],
          },
        });
      } catch (error) {
        consola.error("Error opening Discord:", error);
      }
    } else if (action === "vscode") {
      consola.info("Opening the project in VSCode...");
      try {
        await openApp("code", { arguments: [targetDir] });
      } catch (error) {
        consola.error("Error opening VSCode:", error);
      }
    } else if (action === "removeTemp") {
      const tempRepoDir = isDevelopment
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

  // CLI will always close after all actions are executed
  consola.success(
    "👋 Closing the CLI... Thanks for using Reliverse! See you next time!\n",
  );
  process.exit(0);
}
