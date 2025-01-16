import {
  confirmPrompt,
  selectPrompt,
  spinnerTaskPrompt,
  multiselectPrompt,
  nextStepsPrompt,
  inputPrompt,
} from "@reliverse/prompts";
import { relinka } from "@reliverse/relinka";
import { execa } from "execa";
import fs from "fs-extra";
import { installDependencies } from "nypm";
import open from "open";
import os from "os";
import path from "pathe";
import pc from "picocolors";

import type { Behavior, DeploymentService } from "~/types.js";
import type { TemplateOption } from "~/utils/projectTemplate.js";
import type { ReliverseConfig } from "~/utils/schemaConfig.js";
import type { ReliverseMemory } from "~/utils/schemaMemory.js";

import { setupI18nFiles } from "~/app/menu/create-project/cp-modules/cli-main-modules/downloads/downloadI18nFiles.js";
import { extractRepoInfo } from "~/app/menu/create-project/cp-modules/cli-main-modules/handlers/extractRepoInfo.js";
import { isVSCodeInstalled } from "~/app/menu/create-project/cp-modules/cli-main-modules/handlers/isAppInstalled.js";
import { promptPackageJsonScripts } from "~/app/menu/create-project/cp-modules/cli-main-modules/handlers/promptPackageJsonScripts.js";
import { replaceStringsInFiles } from "~/app/menu/create-project/cp-modules/cli-main-modules/handlers/replaceStringsInFiles.js";
import { askProjectName } from "~/app/menu/create-project/cp-modules/cli-main-modules/modules/askProjectName.js";
import { askUserName } from "~/app/menu/create-project/cp-modules/cli-main-modules/modules/askUserName.js";
import { promptGitDeploy } from "~/app/menu/create-project/cp-modules/git-deploy-prompts/gdp-mod.js";
import { readPackageJson } from "~/utils/pkgJsonHelpers.js";

/**
 * For parsing and updating package.json
 */
export type PackageJson = {
  name?: string;
  scripts?: Record<string, string>;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
};

/**
 * Minimal object describing essential project info after initialization
 */
export type ProjectConfig = {
  uiUsername: string;
  projectName: string;
  primaryDomain: string;
};

/**
 * Ensures a unique project name by prompting for a new one if the target directory exists.
 */
async function ensureUniqueProjectName(
  initialName: string,
  isDev: boolean,
  cwd: string,
  skipPrompts: boolean,
): Promise<string> {
  let projectName = initialName;
  let targetPath = isDev
    ? path.join(cwd, "tests-runtime", projectName)
    : path.join(cwd, projectName);

  let index = 1;
  while (await fs.pathExists(targetPath)) {
    if (skipPrompts) {
      // In auto mode, append an incrementing index to make it unique
      projectName = `${initialName}-${index}`;
      index++;
    } else {
      // Prompt for a new name
      projectName = await inputPrompt({
        title: `Project directory '${projectName}' already exists. Please choose a different name:`,
        defaultValue: `${projectName}-${index}`,
        validate: (value) => {
          if (!value) return "Project name cannot be empty";
          if (!/^[a-z0-9-_]+$/i.test(value)) {
            return "Project name can only contain letters, numbers, hyphens, and underscores";
          }
          return true;
        },
      });
    }
    targetPath = isDev
      ? path.join(cwd, "tests-runtime", projectName)
      : path.join(cwd, projectName);
  }

  return projectName;
}

/**
 * Asks or auto-fills project details (username, projectName, domain).
 */
export async function initializeProjectConfig(
  memory: ReliverseMemory,
  config: ReliverseConfig,
  skipPrompts: boolean,
  isDev: boolean,
  cwd: string,
): Promise<ProjectConfig> {
  // 1. Determine user (author)
  const uiUsername =
    skipPrompts && config?.projectAuthor
      ? config.projectAuthor
      : ((await askUserName(memory)) ?? "");

  // 2. Determine project name
  let projectName: string;
  if (skipPrompts) {
    // Use config's project name if available, regardless of isMultiConfig
    // This ensures we respect the config's project name in both single and multi-config modes
    if (config?.projectName) {
      projectName = config.projectName;
    } else if (config?.projectTemplate) {
      projectName = path.basename(config.projectTemplate);
    } else {
      // Fallback: prompt user anyway
      projectName = (await askProjectName()) ?? "my-app";
    }
  } else {
    // Normal prompt flow
    projectName = (await askProjectName()) ?? "my-app";
  }

  // Ensure the project name is unique
  projectName = await ensureUniqueProjectName(
    projectName,
    isDev,
    cwd,
    skipPrompts,
  );

  // 3. Determine domain
  const primaryDomain =
    skipPrompts && config?.projectDomain
      ? config.projectDomain
      : `${projectName}.vercel.app`;

  return { uiUsername, projectName, primaryDomain };
}

/**
 * Replaces placeholders in the downloaded template with user-specified values.
 */
export async function replaceTemplateStrings(
  projectPath: string,
  webProjectTemplate: TemplateOption,
  config: ProjectConfig,
) {
  await spinnerTaskPrompt({
    spinnerSolution: "ora",
    initialMessage: "Editing texts in the initialized files...",
    successMessage: "✅ Finished editing texts in the initialized files.",
    errorMessage: "❌ Failed to edit some texts...",
    async action(updateMessage: (msg: string) => void) {
      const { author, projectName: oldProjectName } =
        extractRepoInfo(webProjectTemplate);
      updateMessage("Some magic is happening... Please wait...");

      // Potential replacements
      const replacements: Record<string, string> = {
        [`${oldProjectName}.com`]: config.primaryDomain,
        [author]: config.uiUsername,
        [oldProjectName]: config.projectName,
        ["relivator.com"]: config.primaryDomain,
      };

      // Filter out empty or identical
      const validReplacements = Object.fromEntries(
        Object.entries(replacements).filter(
          ([key, value]) => key && value && key !== value,
        ),
      );

      try {
        await replaceStringsInFiles(projectPath, validReplacements);
      } catch (error) {
        relinka(
          "error",
          "Failed to replace strings in files:",
          error instanceof Error ? error.message : String(error),
        );
      }
    },
  });
}

/**
 * Sets up i18n if needed and not already present.
 * Uses config.i18nBehavior to determine automatic behavior.
 */
export async function setupI18nSupport(
  projectPath: string,
  skipPrompts: boolean,
  config: ReliverseConfig,
) {
  // Check if i18n folder already exists
  const i18nFolderExists =
    (await fs.pathExists(path.join(projectPath, "src/app/[locale]"))) ||
    (await fs.pathExists(path.join(projectPath, "src/app/[lang]")));

  if (i18nFolderExists) {
    relinka(
      "info-verbose",
      "i18n is already enabled in the template. No changes needed.",
    );
    return;
  }

  // Determine if i18n should be enabled based on behavior setting
  const i18nBehavior = config?.i18nBehavior ?? "prompt";
  let shouldEnableI18n = false;

  if (skipPrompts || i18nBehavior !== "prompt") {
    // Use automatic behavior if skipping prompts or behavior is set
    shouldEnableI18n = i18nBehavior === "autoYes";
  } else {
    // If prompting is allowed, ask user
    shouldEnableI18n = await confirmPrompt({
      title: "Do you want to enable i18n (internationalization)?",
      displayInstructions: true,
      content: "If `N`, i18n folder won't be created.",
      defaultValue: false,
    });
  }

  // Only proceed with setup if i18n should be enabled
  if (shouldEnableI18n) {
    await setupI18nFiles(projectPath);
  }
}

/**
 * Installs dependencies and checks optional DB push script.
 */
export async function handleDependencies(
  projectPath: string,
  config: ReliverseConfig,
) {
  const depsBehavior: Behavior = config?.depsBehavior ?? "prompt";
  const shouldInstallDeps = await determineShouldInstallDeps(depsBehavior);

  let shouldRunDbPush = false;
  if (shouldInstallDeps) {
    await installDependencies({ cwd: projectPath });

    // Check if there's a db push script
    const scriptStatus = await promptPackageJsonScripts(
      projectPath,
      shouldRunDbPush,
      true,
    );
    shouldRunDbPush = scriptStatus.dbPush;
  }

  return { shouldInstallDeps, shouldRunDbPush };
}

/**
 * Decides whether to install deps based on config or user input.
 */
export async function determineShouldInstallDeps(
  depsBehavior: Behavior,
): Promise<boolean> {
  switch (depsBehavior) {
    case "autoYes":
      return true;
    case "autoNo":
      return false;
    default: {
      return await confirmPrompt({
        title: "Install dependencies now? Recommended, but may take time.",
        content: "This allows me to run scripts provided by the template.",
      });
    }
  }
}

/**
 * Moves the project from a test runtime directory to a user-specified location.
 */
async function moveProjectFromTestsRuntime(
  projectName: string,
  sourceDir: string,
): Promise<string | null> {
  try {
    const shouldUseProject = await confirmPrompt({
      title: `Project bootstrapped in dev mode. Move to a permanent location? ${pc.redBright(
        "[🚨 Experimental]",
      )}`,
      content:
        "If yes, I'll move it from the tests-runtime directory to a new location you specify.",
      defaultValue: false,
    });

    if (!shouldUseProject) {
      return null;
    }

    const defaultPath = getDefaultProjectPath();
    const targetDir = await inputPrompt({
      title: "Where should I move the project?",
      content: "Enter a desired path:",
      placeholder: `Press <Enter> to use default: ${defaultPath}`,
      defaultValue: defaultPath,
    });

    // Ensure the directory exists
    await fs.ensureDir(targetDir);

    // Check if a directory with the same name exists
    let finalProjectName = projectName;
    let finalPath = path.join(targetDir, projectName);
    let counter = 1;

    while (await fs.pathExists(finalPath)) {
      const newName = await inputPrompt({
        title: `Directory '${finalProjectName}' already exists at ${targetDir}`,
        content: "Enter a new name for the project directory:",
        defaultValue: `${projectName}-${counter}`,
        validate: (value: string) =>
          /^[a-zA-Z0-9-_]+$/.test(value)
            ? true
            : "Invalid directory name format",
      });

      finalProjectName = newName;
      finalPath = path.join(targetDir, finalProjectName);
      counter++;
    }

    await fs.move(sourceDir, finalPath);
    relinka("success", `Project moved to ${finalPath}`);
    return finalPath;
  } catch (error) {
    relinka("error", "Failed to move project:", String(error));
    return null;
  }
}

/**
 * Chooses a default path based on OS for test -> permanent move.
 */
function getDefaultProjectPath(): string {
  const platform = os.platform();
  return platform === "win32"
    ? "C:\\B\\S"
    : path.join(os.homedir(), "Projects");
}

/**
 * Orchestrates final deployment steps with `promptGitDeploy`.
 */
export async function handleDeployment(params: {
  projectName: string;
  config: ReliverseConfig;
  projectPath: string;
  primaryDomain: string;
  hasDbPush: boolean;
  shouldRunDbPush: boolean;
  shouldInstallDeps: boolean;
  isDev: boolean;
  memory: ReliverseMemory;
  cwd: string;
  shouldMaskSecretInput: boolean;
  skipPrompts: boolean;
}): Promise<{
  deployService: DeploymentService | "none";
  primaryDomain: string;
  isDeployed: boolean;
  allDomains: string[];
}> {
  return await promptGitDeploy(params);
}

/**
 * Shows success info, next steps, and handles final user actions (e.g., open in IDE).
 */
export async function showSuccessAndNextSteps(
  projectPath: string,
  webProjectTemplate: TemplateOption,
  uiUsername: string,
  isDeployed: boolean,
  primaryDomain: string,
  allDomains: string[],
  isDev: boolean,
) {
  let finalProjectPath = projectPath;

  // If dev mode, offer to move from tests-runtime
  if (isDev) {
    const newPath = await moveProjectFromTestsRuntime(
      path.basename(projectPath),
      projectPath,
    );
    if (newPath) {
      finalProjectPath = newPath;
    }
  }

  relinka(
    "info",
    `🎉 '${webProjectTemplate}' was installed at ${finalProjectPath}.`,
  );

  const vscodeInstalled = isVSCodeInstalled();

  await nextStepsPrompt({
    title: "🤘 Project created successfully! Next steps:",
    titleColor: "cyanBright",
    content: [
      `- To open in VSCode: code ${finalProjectPath}`,
      `- Or in terminal: cd ${finalProjectPath}`,
      "- Install dependencies manually if needed: bun i OR pnpm i",
      "- Apply linting & formatting: bun check OR pnpm check",
      "- Run the project: bun dev OR pnpm dev",
    ],
  });

  await handleNextActions(
    finalProjectPath,
    vscodeInstalled,
    uiUsername,
    isDeployed,
    primaryDomain,
    allDomains,
  );

  relinka(
    "info",
    uiUsername
      ? `👋 More features soon! See you, ${uiUsername}!`
      : "👋 All done for now!",
  );

  relinka(
    "success",
    "✨ One more thing (experimental):",
    "👉 `reliverse cli` in your new project to add/remove features.",
  );
}

/**
 * Lets the user select further actions: open in IDE, docs, etc.
 */
export async function handleNextActions(
  projectPath: string,
  vscodeInstalled: boolean,
  uiUsername: string,
  isDeployed: boolean,
  primaryDomain: string,
  allDomains: string[],
) {
  const nextActions = await multiselectPrompt({
    title: "What would you like to do next?",
    allowAllUnselected: true,
    titleColor: "cyanBright",
    defaultValue: ["ide"],
    options: [
      {
        label: "Open Your Default Code Editor",
        value: "ide",
        hint: vscodeInstalled ? "Detected: VSCode-based IDE" : "",
      },
      ...(isDeployed
        ? [
            {
              label: "Open Deployed Project",
              value: "deployed",
              hint: `Visit ${primaryDomain}`,
            },
          ]
        : []),
      {
        label: "Support Reliverse on Patreon",
        value: "patreon",
      },
      {
        label: "Join Reliverse Discord Server",
        value: "discord",
      },
      {
        label: "Open Reliverse Documentation",
        value: "docs",
      },
    ],
  });

  for (const action of nextActions) {
    await handleNextAction(action, projectPath, primaryDomain, allDomains);
  }
  relinka(
    "info",
    uiUsername ? `See you soon, ${uiUsername}!` : "Done for now!",
  );
}

/**
 * Handles user-chosen actions: open IDE, open docs, etc.
 */
export async function handleNextAction(
  action: string,
  projectPath: string,
  primaryDomain: string,
  allDomains?: string[],
): Promise<void> {
  try {
    switch (action) {
      case "ide": {
        const vscodeInstalled = isVSCodeInstalled();
        relinka(
          "info",
          vscodeInstalled
            ? "Opening project in VSCode-based IDE..."
            : "Trying to open project in default IDE...",
        );
        try {
          await execa("code", [projectPath]);
        } catch (error) {
          relinka(
            "error",
            "Error opening project in IDE:",
            error instanceof Error ? error.message : String(error),
            `Try manually: code ${projectPath}`,
          );
        }
        break;
      }
      case "deployed": {
        // If multiple domains, let user pick
        if (allDomains && allDomains.length > 1) {
          const selectedDomain = await selectPrompt({
            title: "Select domain to open:",
            options: allDomains.map((d) => ({
              label: d,
              value: d,
              ...(d === primaryDomain ? { hint: "(primary)" } : {}),
            })),
          });
          relinka("info", `Opening deployed project at ${selectedDomain}...`);
          await open(`https://${selectedDomain}`);
        } else {
          relinka("info", `Opening deployed project at ${primaryDomain}...`);
          await open(`https://${primaryDomain}`);
        }
        break;
      }
      case "patreon": {
        relinka("info", "Opening Reliverse Patreon page...");
        await open("https://patreon.com/c/blefnk/membership");
        break;
      }
      case "discord": {
        relinka("info", "Opening Reliverse Discord server...");
        await open("https://discord.gg/Pb8uKbwpsJ");
        break;
      }
      case "docs": {
        relinka("info", "Opening Reliverse documentation...");
        await open("https://docs.reliverse.org");
        break;
      }
      default:
        // No-op
        break;
    }
  } catch (error) {
    relinka("error", `Error handling action '${action}':`, String(error));
  }
}

/**
 * Checks if a project has certain dependencies
 */
export async function checkDependenciesExist(
  projectPath: string,
  dependencies: string[],
): Promise<{ exists: boolean; missing: string[] }> {
  try {
    const packageJson = await readPackageJson(projectPath);
    if (!packageJson) {
      return { exists: false, missing: dependencies };
    }

    const allDeps = {
      ...packageJson.dependencies,
      ...packageJson.devDependencies,
    };
    const missing = dependencies.filter((dep) => !allDeps[dep]);
    return { exists: missing.length === 0, missing };
  } catch (error: unknown) {
    relinka("error", "Error checking dependencies:", String(error));
    return { exists: false, missing: dependencies };
  }
}

/**
 * Validates that certain directories exist in the project
 */
export async function validateProjectStructure(
  projectPath: string,
  requiredPaths: string[] = ["src", "public"],
): Promise<{ isValid: boolean; missing: string[] }> {
  try {
    const missingDirs: string[] = [];
    for (const dirPath of requiredPaths) {
      const fullPath = path.join(projectPath, dirPath);
      if (!(await fs.pathExists(fullPath))) {
        missingDirs.push(dirPath);
      }
    }
    return {
      isValid: missingDirs.length === 0,
      missing: missingDirs,
    };
  } catch (error: unknown) {
    relinka("error", "Error validating project structure:", String(error));
    return { isValid: false, missing: requiredPaths };
  }
}

/**
 * Updates package.json fields
 */
export async function updatePackageJson(
  projectPath: string,
  updates: Partial<PackageJson>,
): Promise<boolean> {
  try {
    const packageJson = await readPackageJson(projectPath);
    if (!packageJson) return false;

    const updated = { ...packageJson, ...updates };
    const packageJsonPath = path.join(projectPath, "package.json");

    await fs.writeJson(packageJsonPath, updated, { spaces: 2 });
    return true;
  } catch (error: unknown) {
    relinka("error", "Error updating package.json:", String(error));
    return false;
  }
}
