import {
  confirmPrompt,
  msg,
  multiselectPrompt,
  nextStepsPrompt,
} from "@reliverse/prompts";
import { relinka } from "@reliverse/relinka";
import { execa } from "execa";
import fs from "fs-extra";
import open from "open";
import path from "pathe";

import type { GitOption } from "~/app/menu/askGitInitialization.js";

import { DEBUG, FILE_PATHS } from "~/app/data/constants.js";
import { choosePackageManager } from "~/utils/choosePackageManager.js";
import { initializeGitRepository } from "~/utils/git.js";
import { isVSCodeInstalled } from "~/utils/isAppInstalled.js";

export async function showCongratulationMenu(
  targetDir: string,
  deps: boolean,
  source: string,
  dir: string,
  isDev: boolean,
  gitOption: GitOption,
  username: string,
) {
  const cwd = process.cwd();

  let pkgManager = "bun";
  if (deps) {
    pkgManager = await choosePackageManager(cwd);
  }

  const vscodeInstalled = isVSCodeInstalled();

  const nextActions = await multiselectPrompt({
    title: "What would you like to do next?",
    titleColor: "cyanBright",
    defaultValue: ["close", "ide"],
    options: [
      {
        label: "Close @reliverse/cli",
        value: "close",
        hint: "Close @reliverse/cli",
      },
      {
        label: "Open Reliverse Documentation",
        value: "docs",
      },
      {
        label: "Join Reliverse Discord Server",
        value: "discord",
      },
      {
        label: "Open Your Default Code Editor",
        value: "ide",
        hint: vscodeInstalled ? "Detected: VSCode-based IDE" : "",
      },
    ],
  });

  for (const action of nextActions) {
    if (action === "close") {
      msg({
        type: "M_INFO",
        title: `👋 I'll have some more features coming soon! See you soon, ${username}!`,
        titleColor: "retroGradient",
      });
    } else if (action === "docs") {
      msg({
        type: "M_INFO",
        title: "Opening Reliverse Documentation...",
        titleColor: "retroGradient",
      });
      try {
        await open("https://docs.reliverse.org");
      } catch (error) {
        msg({
          type: "M_ERROR",
          title: "Error opening documentation:",
          content: error.toString(),
        });
      }
    } else if (action === "discord") {
      msg({
        type: "M_INFO",
        title: "Joining Reliverse Discord server...",
        titleColor: "retroGradient",
      });
      try {
        await open("https://discord.gg/Pb8uKbwpsJ");
      } catch (error) {
        msg({
          type: "M_ERROR",
          title: "Error opening Discord:",
          content: error.toString(),
        });
      }
    } else if (action === "ide") {
      msg({
        type: "M_INFO",
        title: vscodeInstalled
          ? "Opening the project in VSCode-based IDE..."
          : "Trying to open the project in your default IDE...",
        titleColor: "retroGradient",
      });
      try {
        await execa("code", [targetDir]);
      } catch (error) {
        msg({
          type: "M_ERROR",
          title: "Error opening project in your IDE:",
          content: error.toString(),
          hint: `Try to open the project manually with command like: code ${targetDir}`,
        });
      }
    }
  }

  const shouldRemoveTemp = true;
  if (shouldRemoveTemp) {
    const tempRepoDir = isDev
      ? path.join(cwd, "tests-runtime", FILE_PATHS.tempRepoClone)
      : path.join(cwd, FILE_PATHS.tempRepoClone);

    if (await fs.pathExists(tempRepoDir)) {
      await fs.remove(tempRepoDir);
      isDev &&
        msg({
          type: "M_INFO",
          title: "Temporary clone folder removed.",
          titleColor: "retroGradient",
        });
    }
  }

  msg({
    type: "M_INFO",
    title: `🎉 ${source} was successfully installed to ${dir}.`,
    titleColor: "retroGradient",
  });

  await nextStepsPrompt({
    title: "🤘 Project created successfully! Next steps to get started:",
    titleColor: "cyanBright",
    content: [
      `- If you have VSCode installed, run: code ${targetDir}`,
      `- You can open the project in your terminal: cd ${targetDir}`,
      `- Install dependencies manually if needed: ${pkgManager} i`,
      `- Apply linting and formatting: ${pkgManager} check`,
      `- Run the project: ${pkgManager} dev`,
    ],
  });

  // Initialize Git repository after all project setup is complete
  await initializeGitRepository(targetDir, gitOption);

  if (isDev) {
    const shouldDeleteProject = await confirmPrompt({
      title: `[--dev] Do you want to delete just created project ${targetDir}?`,
      titleColor: "retroGradient",
    });
    if (shouldDeleteProject) {
      await fs.remove(targetDir);
    }
  }
}
