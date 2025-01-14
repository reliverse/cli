import { confirmPrompt } from "@reliverse/prompts";
import { relinka } from "@reliverse/relinka";
import fs from "fs-extra";
import os from "os";
import path from "path";

import { FALLBACK_ENV_EXAMPLE_URL } from "~/app/constants.js";
import {
  generateProjectConfigs,
  updateProjectConfig,
} from "~/app/menu/create-project/cp-modules/cli-main-modules/handlers/generateProjectConfigs.js";
import { composeEnvFile } from "~/app/menu/create-project/cp-modules/compose-env-file/mod.js";
import { TEMPLATES, saveTemplateToDevice } from "~/utils/projectTemplate.js";

import {
  initializeProjectConfig,
  setupI18nSupport,
  replaceTemplateStrings,
  type CreateWebProjectOptions,
  handleDeployment,
  handleDependencies,
  showSuccessAndNextSteps,
} from "./cp-impl.js";
import { downloadTemplate } from "./cp-modules/cli-main-modules/downloads/downloadTemplate.js";

/**
 * Creates a new web project from a template.
 * Also handles skipping prompts if `skipPromptsUseAutoBehavior` is true.
 */
export async function createWebProject({
  webProjectTemplate,
  message,
  isDev,
  config,
  memory,
  cwd,
}: CreateWebProjectOptions): Promise<void> {
  relinka("info", message);

  // Switch for skipping all prompts
  const skipPrompts = config?.skipPromptsUseAutoBehavior ?? false;

  // If the user wants i18n fully auto-enabled, check `features.i18n` + `i18nBehavior`
  const i18nShouldBeEnabledAutomatically =
    config?.features?.i18n && skipPrompts && config.i18nBehavior === "autoYes";

  // 1) Initialize project config (ask or auto-populate)
  const projectConfig = await initializeProjectConfig(
    memory,
    config,
    skipPrompts,
  );
  const {
    uiUsername,
    projectName,
    primaryDomain: initialDomain,
  } = projectConfig;

  let projectPath = "";

  // 2) Identify the chosen template
  const template = TEMPLATES.find((t) => t.id === webProjectTemplate);
  if (!template) {
    throw new Error(
      `Template ${webProjectTemplate} not found in templates list`,
    );
  }

  // 3) Check for a local copy
  const localTemplatePath = path.join(
    os.homedir(),
    ".reliverse",
    template.author,
    template.name,
  );

  let useLocalTemplate = false;
  if (await fs.pathExists(localTemplatePath)) {
    if (skipPrompts) {
      // Auto skip => use local copy
      useLocalTemplate = true;
      relinka("info", "Using local template copy (auto).");
    } else {
      // Prompt user
      useLocalTemplate = await confirmPrompt({
        title: "Local copy found. Use it?",
        content: "N will download the fresh version.",
        defaultValue: true,
      });
    }

    if (useLocalTemplate) {
      projectPath = path.join(cwd, projectName);
      await fs.copy(localTemplatePath, projectPath);
      relinka("info", "Using local template copy...");
    }
  }

  // 4) If we aren’t using local, we download a fresh copy
  if (!projectPath) {
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
  }

  // 5) Optionally save template to device
  let shouldSaveTemplate = false;
  if (skipPrompts) {
    shouldSaveTemplate = false; // auto default
  } else {
    shouldSaveTemplate = await confirmPrompt({
      title: "Save a copy of the template to your device?",
      defaultValue: false,
    });
  }
  if (shouldSaveTemplate) {
    await saveTemplateToDevice(template, projectPath);
  }

  // 6) Replace placeholders in the template
  await replaceTemplateStrings(projectPath, webProjectTemplate, {
    primaryDomain: initialDomain,
    uiUsername,
    projectName,
  });

  // 7) Setup i18n (either fully automatic or prompt-based)
  await setupI18nSupport(
    projectPath,
    skipPrompts,
    i18nShouldBeEnabledAutomatically,
  );

  // 8) Ask about masking secrets
  let shouldMaskSecretInput = false;
  if (skipPrompts) {
    shouldMaskSecretInput = false;
    relinka("info", "Auto-mode: Not masking secret inputs by default.");
  } else {
    shouldMaskSecretInput = await confirmPrompt({
      title: "Do you want to mask secret inputs?",
      content: "Your data will be stored securely either way.",
    });
  }

  // 9) Compose .env files
  await composeEnvFile(
    projectPath,
    FALLBACK_ENV_EXAMPLE_URL,
    shouldMaskSecretInput,
  );

  // 10) Install dependencies
  const { shouldInstallDeps, shouldRunDbPush } = await handleDependencies(
    projectPath,
    config,
  );

  // 11) Generate initial .reliverse config or update
  await generateProjectConfigs(
    projectPath,
    projectName,
    uiUsername,
    "vercel",
    initialDomain,
    i18nShouldBeEnabledAutomatically || false,
    uiUsername,
  );

  // 12) Handle deployment flow
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
      shouldMaskSecretInput,
    });

  // 13) If user changed domain or deploy service, update .reliverse again
  if (deployService !== "vercel" || primaryDomain !== initialDomain) {
    await updateProjectConfig(projectPath, "reliverse", {
      deployService,
      primaryDomain,
    });
  }

  // 14) Finally, show success & next steps
  await showSuccessAndNextSteps(
    projectPath,
    webProjectTemplate,
    uiUsername,
    isDeployed,
    primaryDomain,
    allDomains,
    isDev,
  );
}
