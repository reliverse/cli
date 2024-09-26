import { consola } from "consola";
import path from "node:path";

import { buildAnotherTemplate } from "~/prompts/04-buildTemplate";
import { appName } from "~/prompts/05-appName";
import { githubUsername } from "~/prompts/06-gitUsername";
import { userWebsite } from "~/prompts/07-userWebsite";
import { gitInitialization } from "~/prompts/08-gitInitialization";
import { dependencies } from "~/prompts/09-installDependencies";
import { confirmation } from "~/prompts/10-confirmation";
import { promptI18n } from "~/prompts/11-internationalization";
import { checkAndDownloadFiles } from "~/prompts/13-checkAndDownloadFiles";
import { congratulationMenu } from "~/prompts/14-congratulationMenu";
import { downloadI18nFiles } from "~/prompts/utils/downloadI18nFiles";
import { getCurrentWorkingDirectory } from "~/prompts/utils/fs";
import { handleReplacements } from "~/prompts/utils/handleReplacements";
import { installTemplate } from "~/prompts/utils/installTemplate";
import { moveAppToLocale } from "~/prompts/utils/moveAppToLocale";
import { isDevelopment } from "~/settings";

export async function buildAnotherTemplateMenu() {
  const cwd = getCurrentWorkingDirectory(); // Get current working directory

  const projectName = await appName(); // Get project name
  const template = await buildAnotherTemplate(); // Select the template
  const githubUser = await githubUsername(); // Get GitHub username
  const website = await userWebsite(); // Get website
  const gitOption = await gitInitialization(); // Git initialization option
  const deps = await dependencies("justInstallRelivator"); // Get dependencies (array of strings)

  // Display summary
  const confirmed = await confirmation(
    template,
    projectName,
    githubUser,
    website,
    gitOption,
    deps,
  );

  if (!confirmed) {
    consola.info("Project creation process was canceled.");

    return;
  }

  // Install the selected template
  await installTemplate(projectName, template, deps, gitOption);

  // Set the target directory
  const targetDir = isDevelopment
    ? path.join(cwd, "..", projectName)
    : path.join(cwd, projectName);

  // Handle string replacements in the project files (e.g., replace placeholders)
  await handleReplacements(
    targetDir,
    template,
    projectName,
    githubUser,
    website,
  );

  // Ask if the user wants i18n support
  const enableI18n = await promptI18n();

  if (enableI18n) {
    // Move all content to src/app/[locale] and handle i18n files
    await moveAppToLocale(targetDir);
    await downloadI18nFiles(targetDir, isDevelopment);
  }

  // Check and download any necessary files
  await checkAndDownloadFiles(targetDir, projectName);

  // Display the final congratulation menu with the next steps
  await congratulationMenu(targetDir, deps, template, targetDir);
}
