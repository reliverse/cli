import { consola } from "consola";
import path from "pathe";
import { askAppName } from "~/menu/05-askAppName";
import { askUserName } from "~/menu/06-askUserName";
import { askAppDomain } from "~/menu/07-askAppDomain";
import { askGitInitialization } from "~/menu/08-askGitInitialization";
import { askInstallDependencies } from "~/menu/09-askInstallDependencies";
import { askSummaryConfirmation } from "~/menu/10-askSummaryConfirmation";
import { askInternationalizationSetup } from "~/menu/11-askInternationalizationSetup";
import { askCheckAndDownloadFiles } from "~/menu/13-askCheckAndDownloadFiles";
import { showCongratulationMenu } from "~/menu/15-showCongratulationMenu";
import { downloadI18nFiles } from "~/utils/downloadI18nFiles";
import { getCurrentWorkingDirectory } from "~/utils/fs";
import { handleStringReplacements } from "~/utils/handleStringReplacements";
import { downloadGitRepo } from "~/utils/downloadGitRepo";
import { moveAppToLocale } from "~/utils/moveAppToLocale";
import { isDev } from "~/app";
export async function askProjectDetails(
  template: string,
  message: string,
  mode: "buildOwnRelivator" | "installAnyGitRepo" | "justInstallRelivator",
  allowI18nPrompt: boolean,
) {
  consola.info(message);

  const appName = await askAppName();
  const username = await askUserName();
  const domain = await askAppDomain();
  // const git = await askGitInitialization();
  // const deps = await askInstallDependencies(mode);

  // const confirmed = await askSummaryConfirmation(
  //   template,
  //   appName,
  //   username,
  //   domain,
  //   git,
  //   deps,
  // );

  // if (!confirmed) {
  //   consola.info("Project creation process was canceled.");
  //   return;
  // }

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

  consola.success("🎉 Project created successfully!");
}
