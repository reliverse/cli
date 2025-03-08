import { confirmPrompt } from "@reliverse/prompts";
import { relinka } from "@reliverse/prompts";
import fs from "fs-extra";

import type { ReliverseConfig } from "~/libs/config/config-main.js";
import type { RepoOption } from "~/utils/projectRepository.js";
import type { ReliverseMemory } from "~/utils/schemaMemory.js";

import { composeEnvFile } from "~/app/menu/create-project/cp-modules/compose-env-file/cef-mod.js";
import { FALLBACK_ENV_EXAMPLE_URL } from "~/libs/sdk/constants.js";
import { handleDownload } from "~/utils/downloading/handleDownload.js";
import { generateProjectConfigs } from "~/utils/handlers/generateProjectConfigs.js";
import { isMultireliProject } from "~/utils/multireliHelpers.js";
import {
  getReliverseConfigPath,
  updateReliverseConfig,
} from "~/utils/reliverseConfig.js";
import { handleReplacements } from "~/utils/replacements/reps-mod.js";

import {
  initializeProjectConfig,
  setupI18nSupport,
  handleDependencies,
  showSuccessAndNextSteps,
} from "./cp-impl.js";
import { promptGitDeploy } from "./cp-modules/git-deploy-prompts/gdp-mod.js";

/**
 * Creates a new web project from a template.
 * Also handles skipping prompts if `skipPromptsUseAutoBehavior` is true.
 */
export async function createWebProject({
  initialProjectName,
  selectedRepo,
  message,
  isDev,
  config,
  memory,
  cwd,
  skipPrompts,
}: {
  projectName: string;
  initialProjectName: string;
  selectedRepo: RepoOption;
  message: string;
  isDev: boolean;
  config: ReliverseConfig;
  memory: ReliverseMemory;
  cwd: string;
  skipPrompts: boolean;
}): Promise<void> {
  relinka("info", message);

  // -------------------------------------------------
  // 1) Check if the project is a multireli project
  // -------------------------------------------------
  const isMultireli = await isMultireliProject(cwd);
  if (isMultireli) {
    relinka("info", "✅ Multireli mode activated");
  }

  // -------------------------------------------------
  // 2) Initialize project configuration
  // -------------------------------------------------
  const projectConfig = await initializeProjectConfig(
    initialProjectName,
    memory,
    config,
    skipPrompts,
    isDev,
    cwd,
  );
  const {
    frontendUsername,
    projectName,
    primaryDomain: initialDomain,
  } = projectConfig;

  // -------------------------------------------------
  // 3) Download template
  // -------------------------------------------------
  const { dir: projectPath } = await handleDownload({
    cwd,
    isDev,
    skipPrompts,
    projectPath: "",
    projectName,
    selectedRepo,
    config,
    preserveGit: false,
    isTemplateDownload: true,
  });

  // -------------------------------------------------
  // 4) Replace placeholders in the template
  // -------------------------------------------------
  const result = await getReliverseConfigPath(projectPath, true);
  if (!result) {
    throw new Error("Failed to get reliverse config path.");
  }
  const { configPath, isTS } = result;
  await handleReplacements(
    projectPath,
    selectedRepo,
    configPath,
    {
      primaryDomain: initialDomain,
      frontendUsername,
      projectName,
    },
    false,
    true,
    true,
  );

  // -------------------------------------------------
  // 5) Remove reliverse config from project if exists
  // -------------------------------------------------
  if (await fs.pathExists(configPath)) {
    relinka("info-verbose", `Removed: ${configPath}, isTS: ${isTS}`);
    await fs.remove(configPath);
  }

  // -------------------------------------------------
  // 6) Setup i18n (auto or prompt-based)
  // -------------------------------------------------
  const enableI18n = await setupI18nSupport(projectPath, config);

  // -------------------------------------------------
  // 7) Ask about masking secrets
  // -------------------------------------------------
  let maskInput = true;
  if (skipPrompts) {
    relinka("info", "Auto-mode: Masking secret inputs by default.");
  } else {
    maskInput = await confirmPrompt({
      title: "Do you want to mask secret inputs?",
      content: "Regardless, your data will be stored securely.",
    });
  }

  // -------------------------------------------------
  // 8) Compose .env files
  // -------------------------------------------------
  await composeEnvFile(
    projectPath,
    FALLBACK_ENV_EXAMPLE_URL,
    maskInput,
    skipPrompts,
    config,
    isMultireli,
  );

  // -------------------------------------------------
  // 9) Handle dependencies (install or not?)
  // -------------------------------------------------
  const { shouldInstallDeps, shouldRunDbPush } = await handleDependencies(
    projectPath,
    config,
  );

  // -------------------------------------------------
  // 10) Generate or update project config files
  // -------------------------------------------------
  await generateProjectConfigs(
    projectPath,
    projectName,
    frontendUsername,
    "vercel",
    initialDomain,
    enableI18n,
    isDev,
  );

  // -------------------------------------------------
  // 11) Deployment flow
  // -------------------------------------------------
  const { deployService, primaryDomain, isDeployed, allDomains } =
    await promptGitDeploy({
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
      maskInput,
      skipPrompts,
      selectedTemplate: selectedRepo,
      isTemplateDownload: false,
      frontendUsername,
    });

  // If the user changed domain or deploy service, update reliverse config again
  if (deployService !== "vercel" || primaryDomain !== initialDomain) {
    await updateReliverseConfig(
      projectPath,
      {
        projectDeployService: deployService,
        projectDomain: primaryDomain,
      },
      isDev,
    );
  }

  // -------------------------------------------------
  // 12) Final success & next steps
  // -------------------------------------------------
  await showSuccessAndNextSteps(
    projectPath,
    selectedRepo,
    frontendUsername,
    isDeployed,
    primaryDomain,
    allDomains,
    skipPrompts,
    isDev,
  );
}
