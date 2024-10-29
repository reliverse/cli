import { consola } from "consola";
import path from "pathe";
import { askAppName } from "~/prompts/05-askAppName";
import { askUserName } from "~/prompts/06-askUserName";
import { askAppDomain } from "~/prompts/07-askAppDomain";
import {
  askGitInitialization,
  type GitOption,
} from "~/prompts/08-askGitInitialization";
import { askInstallDependencies } from "~/prompts/09-askInstallDependencies";
import { askSummaryConfirmation } from "~/prompts/10-askSummaryConfirmation";
import { askInternationalizationSetup } from "~/prompts/11-askInternationalizationSetup";
import { askCheckAndDownloadFiles } from "~/prompts/13-askCheckAndDownloadFiles";
import { showCongratulationMenu } from "~/prompts/15-showCongratulationMenu";
import { downloadI18nFiles } from "~/prompts/utils/downloadI18nFiles";
import { getCurrentWorkingDirectory } from "~/prompts/utils/fs";
import { handleStringReplacements } from "~/prompts/utils/handleStringReplacements";
import { downloadGitRepo } from "~/prompts/utils/downloadGitRepo";
import { moveAppToLocale } from "~/prompts/utils/moveAppToLocale";
import { isDev } from "~/settings";

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

  if (!confirmed) {
    consola.info("Project creation process was canceled.");
    return;
  }

  await downloadGitRepo(appName, template, deps, git);

  const cwd = getCurrentWorkingDirectory();
  const targetDir = isDev
    ? path.join(cwd, "..", appName)
    : path.join(cwd, appName);

  await handleStringReplacements(
    targetDir,
    template,
    appName,
    username,
    domain,
  );

  if (allowI18nPrompt) {
    const i18nShouldBeEnabled = await askInternationalizationSetup();
    if (i18nShouldBeEnabled) {
      await moveAppToLocale(targetDir);
      await downloadI18nFiles(targetDir, isDev);
    }
  }

  await askCheckAndDownloadFiles(targetDir, appName);
  await showCongratulationMenu(targetDir, deps, template, targetDir);
}
