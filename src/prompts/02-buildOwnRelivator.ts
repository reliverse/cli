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

export async function buildOwnRelivator() {
  const cwd = getCurrentWorkingDirectory();

  consola.info(
    // "blefnk/relivator template is a highly modified sadmann7/skateshop. This template can be a good starting point to build your own Relivator as well.",
    "Let's build your own Relivator from scratch! We'll use the reliverse/next-react-js-minimal template as a starting point.",
  );

  // const template = await buildRelivatorTemplate(); // 04-buildTemplate.ts
  const template = "reliverse/next-react-js-minimal";

  const projectName = await askAppName(); // 05-askAppName.ts
  const githubUser = await askUserName(); // 06-gitUsername.ts
  const website = await askAppDomain(); // 07-askAppDomain.ts
  const gitOption = await askGitInitialization(); // 08-askGitInitialization.ts
  const deps = await askInstallDependencies("buildRelivator"); // 09-installDependencies.ts

  const confirmed = await askSummaryConfirmation(
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

  const targetDir = isDev
    ? path.join(cwd, "..", projectName)
    : path.join(cwd, projectName);

  await handleReplacements(
    targetDir,
    template,
    projectName,
    githubUser,
    website,
  );

  const enableI18n = await askInternationalizationSetup();

  if (enableI18n) {
    await moveAppToLocale(targetDir);
    await downloadI18nFiles(targetDir, isDev);
  }

  await askCheckAndDownloadFiles(targetDir, projectName);
  await showCongratulationMenu(targetDir, deps, template, targetDir);
}
