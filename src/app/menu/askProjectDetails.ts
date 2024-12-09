import {
  confirmPrompt,
  msg,
  selectPrompt,
  task,
  togglePrompt,
} from "@reliverse/prompts";
import { relinka } from "@reliverse/relinka";
import fs from "fs-extra";
import path from "pathe";
import pc from "picocolors";

import { verbose } from "~/utils/console.js";
import { downloadGitRepo } from "~/utils/downloadGitRepo.js";
import { downloadI18nFiles } from "~/utils/downloadI18nFiles.js";
import { extractRepoInfo } from "~/utils/extractRepoInfo.js";
import { getCurrentWorkingDirectory } from "~/utils/fs.js";
import { initializeGitRepository } from "~/utils/git.js";
import { moveAppToLocale } from "~/utils/moveAppToLocale.js";
import { replaceStringsInFiles } from "~/utils/replaceStringsInFiles.js";

import { askAppDomain } from "./askAppDomain.js";
import { askAppName } from "./askAppName.js";
import { askCheckAndDownloadFiles } from "./askCheckAndDownloadFiles.js";
import { askGitInitialization } from "./askGitInitialization.js";
import { askInstallDependencies } from "./askInstallDependencies.js";
import { askSummaryConfirmation } from "./askSummaryConfirmation.js";
import { askUserName } from "./askUserName.js";
import { showCongratulationMenu } from "./showCongratulationMenu.js";

export async function askProjectDetails({
  template,
  message,
  mode,
  allowI18nPrompt,
  isDev,
}: {
  template: string;
  message: string;
  mode: "buildBrandNewThing" | "installAnyGitRepo";
  allowI18nPrompt: boolean;
  isDev: boolean;
}) {
  msg({
    type: "M_INFO",
    title: message,
    titleColor: "retroGradient",
  });

  const username = await askUserName();

  const appName = await askAppName();

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
  const gitOption = await askGitInitialization();
  const deps = await askInstallDependencies(mode);

  const confirmed = await askSummaryConfirmation(
    template,
    appName,
    username,
    domain,
    gitOption,
    deps,
  );

  verbose("info", "Installation confirmed by the user (3).");

  if (!confirmed) {
    relinka.info("Project creation process was canceled.");
    return;
  }

  verbose("info", "Installation confirmed by the user (4).");

  const cwd = getCurrentWorkingDirectory();
  const targetDir = isDev
    ? path.join(cwd, "tests-runtime", appName)
    : path.join(cwd, appName);

  await task({
    spinnerSolution: "ora",
    initialMessage: `✅ Initializing project ${isDev ? "(--dev)" : ""}...`,
    successMessage: `✅ Project ${appName} initialized successfully!`,
    errorMessage: `❌ Failed to initialize project ${appName}!`,
    async action(updateMessage) {
      updateMessage(`   ${targetDir}`);
      await downloadGitRepo(appName, template, isDev); // template = blefnk/versator
    },
  });

  // msg({
  //   type: "M_INFO",
  //   title: `✅ Initializing project ${isDev ? "(--dev)" : ""}...`,
  //   titleColor: "retroGradient",
  //   content: `   ${targetDir}`,
  //   contentColor: "retroGradient",
  //   addNewLineAfter: true,
  // });

  // todo: handle deps installing (not using `giget` anymore - for some reason it was not downloading all files from the repos)

  // msg({
  //   type: "M_INFO",
  //   title: " Please wait...",
  //   titleColor: "retroGradient",
  //   addNewLineAfter: true,
  // });

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
    // const i18nShouldBeEnabled = await togglePrompt({
    const i18nShouldBeEnabled = await confirmPrompt({
      title:
        "Do you want to enable i18n (internationalization) for this project?",
      // options: ["Yes", "No"],
    });

    // detect 'messages' folder
    // const possibleMessagesFolders = ["src/messages", "src/app/messages"];
    // const messagesFolder = possibleMessagesFolders.find(async (folder) =>
    //   fs.pathExists(path.join(targetDir, folder)),
    // );
    // if (messagesFolder) {
    //   relinka.info("i18n is already enabled for this project.");
    // }

    // possible 18n folders
    const i18nFolders = ["src/app/[locale]"]; // todo: handle other frameworks and i18n libs paths

    for (const folder of i18nFolders) {
      if (await fs.pathExists(path.join(targetDir, folder))) {
        msg({
          type: "M_INFO",
          title: "i18n is already enabled for this project. Skipping...",
          titleColor: "retroGradient",
          addNewLineAfter: true,
        });
        break;
      }
    }

    // todo: ensure these functions works as expected
    if (i18nShouldBeEnabled) {
      await task({
        spinnerSolution: "ora",
        initialMessage: "Moving app to locale...",
        successMessage: "✅ I moved app to locale successfully!",
        errorMessage: "❌ I've failed to move app to locale...",
        async action(updateMessage) {
          await moveAppToLocale(targetDir);
          updateMessage("Some magic is happening... This may take a while...");
          await downloadI18nFiles(targetDir, isDev);
        },
      });
    }

    if (!i18nShouldBeEnabled) {
      msg({
        type: "M_INFO",
        title: "Just a moment...",
        titleColor: "retroGradient",
        content:
          "I'm trying to convert initialized project from i18n version to non-i18n...",
        contentColor: "retroGradient",
      });
    }
  }

  // todo: ensure these functions works as expected
  await askCheckAndDownloadFiles(targetDir, appName);
  await showCongratulationMenu(
    targetDir,
    deps,
    template,
    targetDir,
    isDev,
    gitOption,
    username,
  );
}
