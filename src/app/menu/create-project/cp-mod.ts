import { FALLBACK_ENV_EXAMPLE_URL } from "~/app/db/constants.js";
import { downloadTemplate } from "~/app/menu/create-project/cp-modules/cli-main-modules/downloads/downloadTemplate.js";
import { generateProjectConfigs } from "~/app/menu/create-project/cp-modules/cli-main-modules/handlers/generateProjectConfigs.js";
import { relinka } from "~/app/menu/create-project/cp-modules/cli-main-modules/handlers/logger.js";
import { generateReliverseFile } from "~/app/menu/create-project/cp-modules/cli-main-modules/handlers/reliverseConfig.js";
import { composeEnvFile } from "~/app/menu/create-project/cp-modules/compose-env-file/mod.js";

import {
  initializeProjectConfig,
  setupI18nSupport,
  replaceTemplateStrings,
  type CreateWebProjectOptions,
  handleDeployment,
  handleDependencies,
  showSuccessAndNextSteps,
} from "./cp-impl.js";

/**
 * Creates a new web project from a template
 */
export async function createWebProject({
  webProjectTemplate,
  message,
  i18nShouldBeEnabled: defaultI18nShouldBeEnabled,
  isDev,
  config,
}: CreateWebProjectOptions): Promise<void> {
  relinka("info", message);

  const shouldUseDataFromConfig =
    config?.experimental?.skipPromptsUseAutoBehavior ?? false;

  // Initialize project configuration
  const projectConfig = await initializeProjectConfig(
    config,
    shouldUseDataFromConfig,
  );
  const {
    frontendUsername,
    projectName,
    primaryDomain: initialDomain,
  } = projectConfig;

  let targetDir = "";

  // Download and setup template
  try {
    relinka(
      "info",
      `Now I'm downloading the ${webProjectTemplate} template...`,
    );
    targetDir = await downloadTemplate(webProjectTemplate, projectName, isDev);
  } catch (error) {
    relinka("error", "Failed to download template:", String(error));
    throw error;
  }

  // Replace template strings
  await replaceTemplateStrings(targetDir, webProjectTemplate, {
    primaryDomain: initialDomain,
    frontendUsername,
    projectName,
  });

  // Setup i18n if needed
  if (defaultI18nShouldBeEnabled) {
    await setupI18nSupport(targetDir, config, shouldUseDataFromConfig);
  }

  // Setup environment
  await composeEnvFile(targetDir, FALLBACK_ENV_EXAMPLE_URL);
  await generateProjectConfigs(targetDir);

  // Handle dependencies
  const { shouldInstallDeps, shouldRunDbPush } = await handleDependencies(
    targetDir,
    config,
  );

  // Handle deployment
  const { deployService, primaryDomain, isDeployed, allDomains } =
    await handleDeployment({
      projectName,
      config,
      targetDir,
      primaryDomain: initialDomain,
      hasDbPush: shouldRunDbPush,
      shouldRunDbPush,
      shouldInstallDeps,
      isDev,
    });

  // Generate config file
  await generateReliverseFile({
    projectName,
    frontendUsername,
    deployService,
    primaryDomain,
    targetDir,
    i18nShouldBeEnabled: defaultI18nShouldBeEnabled,
    shouldInstallDeps,
    isDeployed,
  });

  // Show success message and next steps
  await showSuccessAndNextSteps(
    targetDir,
    webProjectTemplate,
    frontendUsername,
    isDeployed,
    primaryDomain,
    allDomains,
    isDev,
  );
}
