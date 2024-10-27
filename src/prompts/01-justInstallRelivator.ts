import { consola } from "consola";
import path from "pathe";

import { askAppName } from "~/prompts/04-askAppName";
import { askUserName } from "~/prompts/06-askUserName";
import { askAppDomain } from "~/prompts/07-askAppDomain";
import { askGitInitialization } from "~/prompts/08-askGitInitialization";
import { askInstallDependencies } from "~/prompts/09-askInstallDependencies";
import { askSummaryConfirmation } from "~/prompts/10-askSummaryConfirmation";
import { askInternationalizationSetup } from "~/prompts/11-askInternationalizationSetup";
import { askCheckAndDownloadFiles } from "~/prompts/13-askCheckAndDownloadFiles";
import { showCongratulationMenu } from "~/prompts/14-showCongratulationMenu";
import { downloadI18nFiles } from "~/prompts/utils/downloadI18nFiles";
import { getCurrentWorkingDirectory } from "~/prompts/utils/fs";
import { handleReplacements } from "~/prompts/utils/handleReplacements";
import { installTemplate } from "~/prompts/utils/installTemplate";
import { moveAppToLocale } from "~/prompts/utils/moveAppToLocale";
import { isDev } from "~/settings";

export async function justInstallRelivator() {
  const cwd = getCurrentWorkingDirectory();

  const appName = await askAppName();
  const template = "blefnk/relivator-nextjs-template";
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

  // Install the selected template
  await installTemplate(appName, template, deps, git);

  // Set the target directory
  const targetDir = isDev
    ? path.join(cwd, "..", appName)
    : path.join(cwd, appName);

  // Handle string replacements in the project files (e.g., replace placeholders)
  await handleReplacements(targetDir, template, appName, username, domain);

  // Ask if the user wants i18n support
  const enableI18n = await askInternationalizationSetup();

  if (enableI18n) {
    // Move all content to src/app/[locale] and handle i18n files
    await moveAppToLocale(targetDir);
    await downloadI18nFiles(targetDir, isDev);
  }

  // Check and download any necessary files
  await askCheckAndDownloadFiles(targetDir, appName);

  // Display the final congratulation menu with the next steps
  await showCongratulationMenu(targetDir, deps, template, targetDir);
}
