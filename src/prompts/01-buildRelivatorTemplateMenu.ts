import { consola } from "consola";
import path from "node:path";

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

import { buildRelivatorTemplate } from "./04-buildTemplate";

export async function buildRelivatorTemplateMenu() {
  const cwd = getCurrentWorkingDirectory();

  consola.info(
    // eslint-disable-next-line @stylistic/max-len
    "blefnk/relivator template is a highly modified sadmann7/skateshop. This template can be a good starting point to build your own Relivator as well.",
  );

  const template = await buildRelivatorTemplate(); // 04-buildTemplate.ts
  const projectName = await appName(); // 05-appName.ts
  const githubUser = await githubUsername(); // 06-gitUsername.ts
  const website = await userWebsite(); // 07-userWebsite.ts
  const gitOption = await gitInitialization(); // 08-gitInitialization.ts
  const deps = await dependencies("buildRelivator"); // 09-installDependencies.ts

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

  await installTemplate(projectName, template, deps, gitOption);

  const targetDir = isDevelopment
    ? path.join(cwd, "..", projectName)
    : path.join(cwd, projectName);

  await handleReplacements(
    targetDir,
    template,
    projectName,
    githubUser,
    website,
  );

  const enableI18n = await promptI18n();

  if (enableI18n) {
    await moveAppToLocale(targetDir);
    await downloadI18nFiles(targetDir, isDevelopment);
  }

  await checkAndDownloadFiles(targetDir, projectName);
  await congratulationMenu(targetDir, deps, template, targetDir);
}
