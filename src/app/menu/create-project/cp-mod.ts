import { confirmPrompt, selectPrompt } from "@reliverse/prompts";
import { relinka } from "@reliverse/relinka";
import fs from "fs-extra";
import os from "os";
import path from "path";

import type { ReliverseConfig } from "~/utils/schemaConfig.js";
import type { ReliverseMemory } from "~/utils/schemaMemory.js";

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
  getTemplateInfo,
  type Template,
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

type UnghRepoResponse = {
  repo?: {
    pushedAt: string;
  };
};

async function checkTemplateVersion(template: Template) {
  const [owner, repo] = template.id.split("/");
  if (!owner || !repo) return null;

  const response = await fetch(`https://ungh.cc/repos/${owner}/${repo}`);
  const data = (await response.json()) as UnghRepoResponse;
  return data.repo?.pushedAt ?? null;
}

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
    "templates",
    template.author,
    template.name,
  );

  let useLocalTemplate = false;
  if (await fs.pathExists(localTemplatePath)) {
    // Get local template info
    const localInfo = await getTemplateInfo(template.id);
    const currentPushedAt = await checkTemplateVersion(template);

    if (skipPrompts) {
      // Auto skip => use local copy
      useLocalTemplate = true;
      relinka("info", "Using local template copy (auto).");
    } else if (localInfo && currentPushedAt) {
      const localDate = new Date(localInfo.github.pushedAt);
      const currentDate = new Date(currentPushedAt);

      if (currentDate > localDate) {
        // Current version is newer
        const choice = await selectPrompt({
          title: "A newer version of the template is available",
          options: [
            {
              label: "Download latest version",
              value: "download",
              hint: `Last updated ${currentDate.toLocaleDateString()}`,
            },
            {
              label: "Use local copy",
              value: "local",
              hint: `Downloaded ${localDate.toLocaleDateString()}`,
            },
          ],
        });
        useLocalTemplate = choice === "local";
      } else {
        // Local version is up to date, use it automatically
        useLocalTemplate = true;
        relinka("info", "Using local template copy (up to date)...");
      }
    } else {
      // Fallback to simple prompt if version check fails
      useLocalTemplate = await confirmPrompt({
        title: "Local copy found. Use it?",
        content: "If no, I'll download a fresh version.",
        defaultValue: true,
      });
    }

    if (useLocalTemplate) {
      projectPath = isDev
        ? path.join(cwd, "tests-runtime", projectName)
        : path.join(cwd, projectName);
      await fs.copy(localTemplatePath, projectPath);
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
  let shouldSaveTemplate = !useLocalTemplate;
  if (!skipPrompts && !useLocalTemplate) {
    shouldSaveTemplate = await confirmPrompt({
      title: "Save a copy of the template to your device?",
      content:
        "This is useful if you have limited internet data or plan to reuse the template soon.",
      defaultValue: true,
    });
  }
  // If skipPrompts => remain true (but only if not using local copy)
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
  let shouldMaskSecretInput = true;
  if (skipPrompts) {
    relinka("info", "Auto-mode: Masking secret inputs by default.");
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
    config,
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
    isDev,
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
