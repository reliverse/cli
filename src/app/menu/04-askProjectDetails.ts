import { msg, selectPrompt } from "@reliverse/prompts";
import { relinka } from "@reliverse/relinka";
import fs from "fs-extra";
import path from "pathe";
import pc from "picocolors";

import { updateReliverseMemory } from "~/args/memory/impl.js";
import { verbose } from "~/utils/console.js";
import { downloadGitRepo } from "~/utils/downloadGitRepo.js";
import { downloadI18nFiles } from "~/utils/downloadI18nFiles.js";
import { getCurrentWorkingDirectory } from "~/utils/fs.js";
import { handleStringReplacements } from "~/utils/handleStringReplacements.js";
import { moveAppToLocale } from "~/utils/moveAppToLocale.js";

import { askAppName } from "./05-askAppName.js";
import { askUserName } from "./06-askUserName.js";
import { askAppDomain } from "./07-askAppDomain.js";
import { askGitInitialization } from "./08-askGitInitialization.js";
import { askInstallDependencies } from "./09-askInstallDependencies.js";
import { askSummaryConfirmation } from "./10-askSummaryConfirmation.js";

export async function askProjectDetails(
  template: string,
  message: string,
  mode: "buildBrandNewThing" | "installAnyGitRepo",
  allowI18nPrompt: boolean,
  isDev: boolean,
) {
  relinka.success(message);

  msg({
    type: "M_MIDDLE",
  });

  const username = await askUserName();

  const appName = await askAppName();

  const deployService = await selectPrompt({
    title:
      "Which deployment service do you want to use? (You can deploy anywhere, this choice is just to prepare specific code for each platform)",
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
  const git = await askGitInitialization();
  const deps = await askInstallDependencies(mode);

  const confirmed = await askSummaryConfirmation(
    template,
    appName,
    username,
    domain,
    git,
    deps,
  );

  verbose("info", "Installation confirmed by the user (3).");

  if (!confirmed) {
    relinka.info("Project creation process was canceled.");
    return;
  }

  verbose("info", "Installation confirmed by the user (4).");

  await downloadGitRepo(appName, template, isDev); // template = blefnk/versator

  const cwd = getCurrentWorkingDirectory();
  const targetDir = isDev
    ? path.join(cwd, "..", appName)
    : path.join(cwd, appName);

  msg({
    type: "M_INFO",
    title: "🚀 Initializing project in:",
    titleColor: "dim",
    content: targetDir,
    contentColor: "dim",
    addNewLineAfter: true,
  });

  // todo: handle deps installing (not using `giget` anymore - for some reason it was not downloading all files from the repos)
  // gitOption && (await initializeGitRepository(targetDir, gitOption)); // todo: rewrite, `simple-git` already has .git folder
  await fs.remove(path.join(targetDir, ".git"));

  // await handleStringReplacements(
  //   targetDir,
  //   template,
  //   appName,
  //   username,
  //   domain,
  // );

  // if (allowI18nPrompt) {
  //   const i18nShouldBeEnabled = await askInternationalizationSetup();
  //   if (i18nShouldBeEnabled) {
  //     await moveAppToLocale(targetDir);
  //     await downloadI18nFiles(targetDir, isDev);
  //   }
  // }

  // await askCheckAndDownloadFiles(targetDir, appName);
  // await showCongratulationMenu(targetDir, deps, template, targetDir);

  relinka.success(
    pc.cyanBright(` 👋 To be continued... See you soon, ${username}!`),
  );

  msg({
    type: "M_MIDDLE",
  });
}
