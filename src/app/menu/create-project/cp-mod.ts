import { FALLBACK_ENV_EXAMPLE_URL } from "~/app/constants.js";
import { downloadTemplate } from "~/app/menu/create-project/cp-modules/cli-main-modules/downloads/downloadTemplate.js";
import {
  generateProjectConfigs,
  updateProjectConfig,
} from "~/app/menu/create-project/cp-modules/cli-main-modules/handlers/generateProjectConfigs.js";
import { composeEnvFile } from "~/app/menu/create-project/cp-modules/compose-env-file/mod.js";
import { relinka } from "~/utils/loggerRelinka.js";

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
  memory,
  cwd,
}: CreateWebProjectOptions): Promise<void> {
  relinka("info", message);

  // Check if we should use data from the config
  const shouldUseDataFromConfig = config?.skipPromptsUseAutoBehavior ?? false;

  // Initialize project configuration
  const projectConfig = await initializeProjectConfig(
    memory,
    config,
    shouldUseDataFromConfig,
  );
  const {
    frontendUsername,
    projectName,
    primaryDomain: initialDomain,
  } = projectConfig;

  let projectPath = "";

  // Download and setup template
  try {
    relinka(
      "info",
      `Now I'm downloading the ${webProjectTemplate} template...`,
    );
    projectPath = await downloadTemplate({
      webProjectTemplate,
      projectName,
      isDev,
      cwd,
    });
  } catch (error) {
    relinka("error", "Failed to download template:", String(error));
    throw error;
  }

  // Replace template strings
  await replaceTemplateStrings(projectPath, webProjectTemplate, {
    primaryDomain: initialDomain,
    frontendUsername,
    projectName,
  });

  // Setup i18n if needed
  if (defaultI18nShouldBeEnabled) {
    await setupI18nSupport(projectPath, config, shouldUseDataFromConfig);
  }

  // Setup environment
  await composeEnvFile(projectPath, FALLBACK_ENV_EXAMPLE_URL);

  // Handle dependencies
  const { shouldInstallDeps, shouldRunDbPush } = await handleDependencies(
    projectPath,
    config,
  );

  // Generate initial configs with default deployment service
  await generateProjectConfigs(
    projectPath,
    projectName,
    frontendUsername,
    "vercel",
    initialDomain,
    defaultI18nShouldBeEnabled,
    frontendUsername,
  );

  // Handle deployment
  const { deployService, primaryDomain, isDeployed, allDomains } =
    await handleDeployment({
      projectName,
      config,
      projectPath,
      primaryDomain: initialDomain,
      hasDbPush: shouldRunDbPush,
      shouldRunDbPush,
      shouldInstallDeps,
      isDev,
      memory,
      cwd,
    });

  // If the deployment service is not vercel or the primary
  // domain is different from the initial domain, update the config
  if (deployService !== "vercel" || primaryDomain !== initialDomain) {
    await updateProjectConfig(projectPath, "reliverse", {
      deployService,
      primaryDomain,
    });
  }

  // Show success message and next steps
  await showSuccessAndNextSteps(
    projectPath,
    webProjectTemplate,
    frontendUsername,
    isDeployed,
    primaryDomain,
    allDomains,
    isDev,
  );
}
