import { confirmPrompt } from "@reliverse/prompts";
import { relinka } from "@reliverse/prompts";
import fs from "fs-extra";
import path from "pathe";

import type { RepoOption } from "~/utils/projectRepository.js";
import type { ReliverseConfig } from "~/utils/schemaConfig.js";
import type { ReliverseMemory } from "~/utils/schemaMemory.js";

import { FALLBACK_ENV_EXAMPLE_URL } from "~/app/constants.js";
import { composeEnvFile } from "~/app/menu/create-project/cp-modules/compose-env-file/cef-mod.js";
import { handleDownload } from "~/utils/downloading/handleDownload.js";
import { generateProjectConfigs } from "~/utils/handlers/generateProjectConfigs.js";
import { updateReliverseConfig } from "~/utils/reliverseConfig.js";
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
  // 1) Initialize project configuration
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
  // 2) Download template
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
  // 3) Replace placeholders in the template
  // -------------------------------------------------
  const externalReliversePath = path.join(projectPath, ".reliverse");
  await handleReplacements(
    projectPath,
    selectedRepo,
    externalReliversePath,
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
  // 4) Remove .reliverse file from project if exists
  // -------------------------------------------------
  if (await fs.pathExists(externalReliversePath)) {
    await fs.remove(externalReliversePath);
  }

  // -------------------------------------------------
  // 5) Setup i18n (auto or prompt-based)
  // -------------------------------------------------
  const enableI18n = await setupI18nSupport(projectPath, config);

  // -------------------------------------------------
  // 6) Ask about masking secrets
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
  // 7) Compose .env files
  // -------------------------------------------------
  await composeEnvFile(
    projectPath,
    FALLBACK_ENV_EXAMPLE_URL,
    maskInput,
    skipPrompts,
    config,
  );

  // -------------------------------------------------
  // 8) Handle dependencies (install or not?)
  // -------------------------------------------------
  const { shouldInstallDeps, shouldRunDbPush } = await handleDependencies(
    projectPath,
    config,
  );

  // -------------------------------------------------
  // 9) Generate or update .reliverse config
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
  // 10) Deployment flow
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

  // If the user changed domain or deploy service, update .reliverse again
  if (deployService !== "vercel" || primaryDomain !== initialDomain) {
    await updateReliverseConfig(projectPath, {
      projectDeployService: deployService,
      projectDomain: primaryDomain,
    });
  }

  // -------------------------------------------------
  // 11) Final success & next steps
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
