import { msg } from "@reliverse/prompts";
import { relinka } from "@reliverse/relinka";

// import path from "pathe";
// import { askAppName } from "~/menu/05-askAppName.js";
import { askUserName } from "./06-askUserName.js";
// import { askAppDomain } from "~/menu/07-askAppDomain.js";
// import { askGitInitialization } from "~/menu/08-askGitInitialization.js";
// import { askInstallDependencies } from "~/menu/09-askInstallDependencies.js";
// import { askSummaryConfirmation } from "~/menu/10-askSummaryConfirmation.js";
// import { askInternationalizationSetup } from "~/menu/11-askInternationalizationSetup.js";
// import { askCheckAndDownloadFiles } from "~/menu/13-askCheckAndDownloadFiles.js";
// import { showCongratulationMenu } from "~/menu/15-showCongratulationMenu.js";
// import { downloadI18nFiles } from "~/utils/downloadI18nFiles.js";
// import { getCurrentWorkingDirectory } from "~/utils/fs.js";
// import { handleStringReplacements } from "~/utils/handleStringReplacements.js";
// import { downloadGitRepo } from "~/utils/downloadGitRepo.js";
// import { moveAppToLocale } from "~/utils/moveAppToLocale.js";
// import { isDev } from "~/data.js";
// import { verbose } from "~/utils/console.js";

export async function askProjectDetails(
  template: string,
  message: string,
  mode: "buildBrandNewThing" | "installAnyGitRepo",
  allowI18nPrompt: boolean,
) {
  msg({
    type: "M_MIDDLE",
  });
  relinka.success(message);
  const username = await askUserName();

  /* const appName = await askAppName();
  const domain = await askAppDomain();
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

  verbose("info", "Installation confirmed by the user (4)."); */

  // await downloadGitRepo(appName, template, deps, git);

  // const cwd = getCurrentWorkingDirectory();
  // const targetDir = isDev
  //   ? path.join(cwd, "..", appName)
  //   : path.join(cwd, appName);

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

  relinka.success(` 👋 To be continued... See you, ${username}!`);
}
