import { consola } from "consola";
import path from "pathe";

import { askAppName } from "~/prompts/04-askAppName";
import { askUserName } from "~/prompts/05-askUserName";
import { askAppDomain } from "~/prompts/06-askAppDomain";
import { askGitInitialization } from "~/prompts/07-askGitInitialization";
import { askInstallDependencies } from "~/prompts/08-askInstallDependencies";
import { askSummaryConfirmation } from "~/prompts/09-askSummaryConfirmation";
import { askInternationalizationSetup } from "~/prompts/10-askInternationalizationSetup";
import { askCheckAndDownloadFiles } from "~/prompts/12-askCheckAndDownloadFiles";
import { showCongratulationMenu } from "~/prompts/13-showCongratulationMenu";
import { downloadI18nFiles } from "~/prompts/utils/downloadI18nFiles";
import { getCurrentWorkingDirectory } from "~/prompts/utils/fs";
import { handleStringReplacements } from "~/prompts/utils/handleStringReplacements";
import { downloadGitRepo } from "~/prompts/utils/downloadGitRepo";
import { moveAppToLocale } from "~/prompts/utils/moveAppToLocale";
import { isDev } from "~/settings";

export async function buildOwnRelivator() {
  consola.info(
    "Let's build your own Relivator from scratch! We'll use the blefnk/versator-nextjs-template as a starting point.",
  );

  const template = "blefnk/versator-nextjs-template";
  const appName = await askAppName();
  const githubUser = await askUserName();
  const website = await askAppDomain();
  const git = await askGitInitialization();
  const deps = await askInstallDependencies("buildOwnRelivator");

  const confirmed = await askSummaryConfirmation(
    template,
    appName,
    githubUser,
    website,
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
    githubUser,
    website,
  );

  const enableI18n = await askInternationalizationSetup();

  if (enableI18n) {
    await moveAppToLocale(targetDir);
    await downloadI18nFiles(targetDir, isDev);
  }

  await askCheckAndDownloadFiles(targetDir, appName);
  await showCongratulationMenu(targetDir, deps, template, targetDir);
}
