import { confirmPrompt } from "@reliverse/prompts";
import { relinka } from "@reliverse/relinka";
import fs from "fs-extra";
import os from "os";
import path from "path";

import type { ReliverseMemory } from "~/types.js";
import type { ReliverseConfig } from "~/utils/reliverseSchema.js";

import { FALLBACK_ENV_EXAMPLE_URL } from "~/app/constants.js";
import {
  generateProjectConfigs,
  updateProjectConfig,
} from "~/app/menu/create-project/cp-modules/cli-main-modules/handlers/generateProjectConfigs.js";
import { composeEnvFile } from "~/app/menu/create-project/cp-modules/compose-env-file/mod.js";
import {
  TEMPLATES,
  saveTemplateToDevice,
  type TemplateOption,
} from "~/utils/projectTemplate.js";

import {
  initializeProjectConfig,
  setupI18nSupport,
  replaceTemplateStrings,
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
  skipPrompts,
}: {
  webProjectTemplate: TemplateOption;
  message: string;
  mode: "showNewProjectMenu" | "installAnyGitRepo";
  isDev: boolean;
  config: ReliverseConfig;
  memory: ReliverseMemory;
  cwd: string;
  skipPrompts: boolean;
}): Promise<void> {
  relinka("info", message);

  // -------------------------------------------------
  // 1) Initialize project configuration (prompt or auto)
  // -------------------------------------------------
  const projectConfig = await initializeProjectConfig(
    memory,
    config,
    skipPrompts,
    isDev,
    cwd,
  );
  const {
    uiUsername,
    projectName,
    primaryDomain: initialDomain,
  } = projectConfig;

  let projectPath = "";

  // -------------------------------------------------
  // 2) Identify chosen template
  // -------------------------------------------------
  const template = TEMPLATES.find((t) => t.id === webProjectTemplate);
  if (!template) {
    throw new Error(
      `Template '${webProjectTemplate}' not found in templates list.`,
    );
  }

  // -------------------------------------------------
  // 3) Check for local template copy
  // -------------------------------------------------
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
      // Prompt the user
      useLocalTemplate = await confirmPrompt({
        title: "Local copy found. Use it?",
        content: "If no, I'll download a fresh version.",
        defaultValue: true,
      });
    }

    if (useLocalTemplate) {
      projectPath = isDev
        ? path.join(cwd, "test-runtime", projectName)
        : path.join(cwd, projectName);
      await fs.copy(localTemplatePath, projectPath);
      relinka("info", "Using local template copy...");
    }
  }

  // -------------------------------------------------
  // 4) Download template if no local copy used
  // -------------------------------------------------
  if (!projectPath) {
    try {
      relinka(
        "info",
        `Now I'm downloading the '${webProjectTemplate}' template...`,
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

  // -------------------------------------------------
  // 5) Optionally save template to device
  // -------------------------------------------------
  let shouldSaveTemplate = false;
  if (!skipPrompts) {
    shouldSaveTemplate = await confirmPrompt({
      title: "Save a copy of the template to your device?",
      defaultValue: false,
    });
  }
  // If skipPrompts => remain false
  if (shouldSaveTemplate) {
    await saveTemplateToDevice(template, projectPath);
  }

  // -------------------------------------------------
  // 6) Replace placeholders in the template
  // -------------------------------------------------
  await replaceTemplateStrings(projectPath, webProjectTemplate, {
    primaryDomain: initialDomain,
    uiUsername,
    projectName,
  });

  // -------------------------------------------------
  // 7) Setup i18n (auto or prompt-based)
  // -------------------------------------------------
  await setupI18nSupport(projectPath, skipPrompts, config);

  // -------------------------------------------------
  // 8) Ask about masking secrets
  // -------------------------------------------------
  let shouldMaskSecretInput = false;
  if (skipPrompts) {
    relinka("info", "Auto-mode: Not masking secret inputs by default.");
  } else {
    shouldMaskSecretInput = await confirmPrompt({
      title: "Do you want to mask secret inputs?",
      content: "Regardless, your data will be stored securely.",
    });
  }

  // -------------------------------------------------
  // 9) Compose .env files
  // -------------------------------------------------
  await composeEnvFile(
    projectPath,
    FALLBACK_ENV_EXAMPLE_URL,
    shouldMaskSecretInput,
    skipPrompts,
  );

  // -------------------------------------------------
  // 10) Handle dependencies (install or not?)
  // -------------------------------------------------
  const { shouldInstallDeps, shouldRunDbPush } = await handleDependencies(
    projectPath,
    config,
  );

  // -------------------------------------------------
  // 11) Generate or update .reliverse config
  // -------------------------------------------------
  await generateProjectConfigs(
    projectPath,
    projectName,
    uiUsername,
    "vercel",
    initialDomain,
    config?.features?.i18n || false,
    uiUsername,
  );

  // -------------------------------------------------
  // 12) Deployment flow
  // -------------------------------------------------
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
      skipPrompts,
    });

  // If the user changed domain or deploy service, update .reliverse again
  if (deployService !== "vercel" || primaryDomain !== initialDomain) {
    await updateProjectConfig(projectPath, "reliverse", {
      deployService,
      primaryDomain,
    });
  }

  // -------------------------------------------------
  // 13) Final success & next steps
  // -------------------------------------------------
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
