import { confirmPrompt, selectPrompt, task } from "@reliverse/prompts";
import { multiselectPrompt, nextStepsPrompt, pm } from "@reliverse/prompts";
import { execa } from "execa";
import fs from "fs-extra";
import { installDependencies } from "nypm";
import open from "open";
import os from "os";
import path from "pathe";

import { FILE_PATHS } from "~/app/data/constants.js";
import { askGitInitialization } from "~/app/menu/askGitInitialization.js";
import { relinka } from "~/utils/console.js";
import { downloadGitRepo } from "~/utils/downloadGitRepo.js";
import { downloadI18nFiles } from "~/utils/downloadI18nFiles.js";
import { extractRepoInfo } from "~/utils/extractRepoInfo.js";
import { getCurrentWorkingDirectory } from "~/utils/fs.js";
import { initializeGitRepository } from "~/utils/git.js";
import { i18nMove } from "~/utils/i18nMove.js";
import { isVSCodeInstalled } from "~/utils/isAppInstalled.js";
import { replaceStringsInFiles } from "~/utils/replaceStringsInFiles.js";

import { askAppDomain } from "./askAppDomain.js";
import { askAppName } from "./askAppName.js";
import { askCheckAndDownloadFiles } from "./askCheckAndDownloadFiles.js";
import { askUserName } from "./askUserName.js";
import { composeEnvFile } from "./composeEnvFile.js";

export async function createWebProject({
  template,
  message,
  allowI18nPrompt,
  isDev,
}: {
  template: string;
  message: string;
  mode: "buildBrandNewThing" | "installAnyGitRepo";
  allowI18nPrompt: boolean;
  isDev: boolean;
}) {
  relinka("info", message);

  const username = await askUserName();
  const appName = await askAppName();
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const deployService = await selectPrompt({
    title: "Which deployment service do you want to use?",
    content:
      "You can deploy anywhere, this choice is just to prepare specific code for each platform.",
    options: [
      { label: "Vercel", value: "vercel" },
      {
        label: "...",
        value: "coming-soon",
        hint: "coming soon",
        disabled: true,
      },
    ],
  });

  const domain = await askAppDomain(appName);
  let targetDir: string | undefined;

  relinka("info", `Now I'm downloading the ${template} template...`);

  await task({
    spinnerSolution: "ora",
    initialMessage: "Downloading template...",
    successMessage: "✅ Template downloaded successfully!",
    errorMessage: "❌ Failed to download template...",
    async action(updateMessage) {
      targetDir = await downloadGitRepo(appName, template, isDev);
      updateMessage("Some magic is happening... This may take a while...");
    },
  });

  await task({
    spinnerSolution: "ora",
    initialMessage: "Editing some texts in the initialized files...",
    successMessage: "✅ I edited some texts in the initialized files for you.",
    errorMessage:
      "❌ I've failed to edit some texts in the initialized files...",
    async action(updateMessage) {
      const { author, projectName: oldProjectName } = extractRepoInfo(template);
      updateMessage("Some magic is happening... This may take a while...");
      await replaceStringsInFiles(targetDir, {
        [`${oldProjectName}.com`]: domain,
        [author]: username,
        [oldProjectName]: appName,
        ["relivator.com"]: domain,
      });
    },
  });

  if (allowI18nPrompt) {
    const i18nShouldBeEnabled = await confirmPrompt({
      title:
        "Do you want to enable i18n (internationalization) for this project?",
    });

    const i18nFolderExists = await fs.pathExists(
      path.join(targetDir, "src/app/[locale]"),
    );

    if (i18nFolderExists) {
      relinka(
        "info-verbose",
        "i18n is already enabled for this project. Skipping...",
      );
    }

    if (i18nShouldBeEnabled && !i18nFolderExists) {
      await task({
        spinnerSolution: "ora",
        initialMessage: "Moving app to locale...",
        successMessage: "✅ I moved app to locale successfully!",
        errorMessage: "❌ I've failed to move app to locale...",
        async action(updateMessage) {
          await i18nMove(targetDir, "moveAppToLocale");
          updateMessage("Some magic is happening... This may take a while...");
          await downloadI18nFiles(targetDir, isDev);
        },
      });
    }

    if (!i18nShouldBeEnabled && i18nFolderExists) {
      relinka(
        "info",
        "Just a moment...",
        "I'm trying to convert initialized project from i18n version to non-i18n...",
      );
      await task({
        spinnerSolution: "ora",
        initialMessage: "Moving app to locale...",
        successMessage: "✅ I moved app to locale successfully!",
        errorMessage: "❌ I've failed to move app to locale...",
        async action(updateMessage) {
          await i18nMove(targetDir, "moveLocaleToApp");
          updateMessage("Some magic is happening... This may take a while...");
          await downloadI18nFiles(targetDir, isDev);
        },
      });
    }
  }

  await askCheckAndDownloadFiles(targetDir, appName);

  const cwd = getCurrentWorkingDirectory();
  const pkgManager = pm;
  const gitOption = await askGitInitialization();
  const vscodeInstalled = isVSCodeInstalled();

  const tempGitURL =
    "https://raw.githubusercontent.com/blefnk/relivator/main/.env.example";
  await composeEnvFile(targetDir, tempGitURL);

  await initializeGitRepository(targetDir, gitOption);

  const shouldInstallDependencies = await confirmPrompt({
    title: `Do you want me to execute '${pkgManager} i' to install dependencies? (it takes some time)`,
    titleColor: "retroGradient",
    defaultValue: true,
  });

  if (!shouldInstallDependencies) {
    relinka("info", "You can always install dependencies manually later.");
  } else {
    await installDependencies({
      cwd: targetDir,
    });

    // deprecated
    /* Ask user if they want to install dependencies
    const installDeps = await confirmPrompt({
      title: "Would you like to install dependencies now?",
      defaultValue: true,
    });

    if (installDeps) {
      // Detect package manager and install dependencies
      const hasYarn = await fs.pathExists(path.join(targetDir, "yarn.lock"));
      const hasPnpm = await fs.pathExists(
        path.join(targetDir, "pnpm-lock.yaml"),
      );
      const hasBun = await fs.pathExists(path.join(targetDir, "bun.lockb"));

      const installCmd = hasBun
        ? "bun install"
        : hasPnpm
          ? "pnpm install"
          : hasYarn
            ? "yarn"
            : "npm install";

      await execa(installCmd.split(" ")[0], installCmd.split(" ").slice(1), {
        cwd: targetDir,
      });
      relinka("success-verbose", "Dependencies installed successfully");
    } */
  }

  const shouldRemoveTemp = true;
  if (shouldRemoveTemp) {
    // TODO: maybe we should reimplement this in a better way
    const tempRepoDir = isDev
      ? path.join(cwd, "tests-runtime", FILE_PATHS.tempRepoClone)
      : path.join(
          os.homedir(),
          ".reliverse",
          "projects",
          FILE_PATHS.tempRepoClone,
        );

    if (await fs.pathExists(tempRepoDir)) {
      await fs.remove(tempRepoDir);
      relinka("info-verbose", "Temporary clone folder removed.");
    }
  }

  relinka("info", `🎉 ${template} was successfully installed to ${targetDir}.`);

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
    if (action === "docs") {
      relinka("info", "Opening Reliverse Documentation...");
      try {
        await open("https://docs.reliverse.org");
      } catch (error) {
        relinka("error", "Error opening documentation:", error.toString());
      }
    } else if (action === "discord") {
      relinka("info", "Joining Reliverse Discord server...");
      try {
        await open("https://discord.gg/Pb8uKbwpsJ");
      } catch (error) {
        relinka("error", "Error opening Discord:", error.toString());
      }
    } else if (action === "ide") {
      relinka(
        "info",
        vscodeInstalled
          ? "Opening the project in VSCode-based IDE..."
          : "Trying to open the project in your default IDE...",
      );
      try {
        await execa("code", [targetDir]);
      } catch (error) {
        relinka(
          "error",
          "Error opening project in your IDE:",
          error.toString(),
          `Try to open the project manually with command like: code ${targetDir}`,
        );
      }
    }
  }

  relinka(
    "info",
    `👋 I'll have some more features coming soon! See you soon, ${username}!`,
  );
}
