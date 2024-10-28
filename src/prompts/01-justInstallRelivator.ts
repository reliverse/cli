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
import { isDev, REPO_SHORT_URLS } from "~/settings";

export async function justInstallRelivator() {
  consola.info(
    "Let's create a brand-new web app using the Relivator Next.js template. After that, you can customize everything however you like.",
  );

  const template = REPO_SHORT_URLS.relivatorGithubLink;
  const appName = await askAppName();
  const username = await askUserName();
  const domain = await askAppDomain();
  const git = await askGitInitialization();
  const deps = await askInstallDependencies("justInstallRelivator");

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

  const shouldAddI18n = await askInternationalizationSetup();

  if (shouldAddI18n) {
    await moveAppToLocale(targetDir);
    await downloadI18nFiles(targetDir, isDev);
  }

  await askCheckAndDownloadFiles(targetDir, appName);
  await showCongratulationMenu(targetDir, deps, template, targetDir);
}
