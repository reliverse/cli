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

import type { Behavior, DeploymentService, ReliverseMemory } from "~/types.js";
import type { TemplateOption } from "~/utils/projectTemplate.js";
import type { ReliverseConfig } from "~/utils/reliverseSchema.js";

import { setupI18nFiles } from "~/app/menu/create-project/cp-modules/cli-main-modules/downloads/downloadI18nFiles.js";
import { extractRepoInfo } from "~/app/menu/create-project/cp-modules/cli-main-modules/handlers/extractRepoInfo.js";
import { isVSCodeInstalled } from "~/app/menu/create-project/cp-modules/cli-main-modules/handlers/isAppInstalled.js";
import { promptPackageJsonScripts } from "~/app/menu/create-project/cp-modules/cli-main-modules/handlers/promptPackageJsonScripts.js";
import { replaceStringsInFiles } from "~/app/menu/create-project/cp-modules/cli-main-modules/handlers/replaceStringsInFiles.js";
import { askProjectName } from "~/app/menu/create-project/cp-modules/cli-main-modules/modules/askProjectName.js";
import { askUserName } from "~/app/menu/create-project/cp-modules/cli-main-modules/modules/askUserName.js";
import { promptGitDeploy } from "~/app/menu/create-project/cp-modules/git-deploy-prompts/mod.js";
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
 * The core create-web-project options
 */
export type CreateWebProjectOptions = {
  webProjectTemplate: TemplateOption;
  message: string;
  mode: "showNewProjectMenu" | "installAnyGitRepo";
  isDev: boolean;
  config: ReliverseConfig;
  memory: ReliverseMemory;
  cwd: string;
};

/**
 * Minimally required project config after initialization
 */
export type ProjectConfig = {
  uiUsername: string;
  projectName: string;
  primaryDomain: string;
};

/**
 * Asks or auto-fills project details (username, projectName, domain).
 */
export async function initializeProjectConfig(
  memory: ReliverseMemory,
  config: ReliverseConfig,
  skipPrompts: boolean,
): Promise<ProjectConfig> {
  // If skipPrompts is true & we have config, we auto-fill
  const uiUsername =
    skipPrompts && config?.projectAuthor
      ? config.projectAuthor
      : ((await askUserName(memory)) ?? "");

  const projectName =
    skipPrompts && config?.projectTemplate
      ? path.basename(config.projectTemplate)
      : ((await askProjectName()) ?? "");

  const primaryDomain =
    skipPrompts && config?.projectDomain
      ? config.projectDomain
      : `${projectName}.vercel.app`;

  return { uiUsername, projectName, primaryDomain };
}

/**
 * Replaces occurrences of certain placeholders with real user values.
 */
export async function replaceTemplateStrings(
  projectPath: string,
  webProjectTemplate: TemplateOption,
  config: ProjectConfig,
) {
  await spinnerTaskPrompt({
    spinnerSolution: "ora",
    initialMessage: "Editing some texts in the initialized files...",
    successMessage: "✅ I edited some texts in the initialized files for you.",
    errorMessage: "❌ I've failed to edit some texts...",
    async action(updateMessage: (message: string) => void) {
      const { author, projectName: oldProjectName } =
        extractRepoInfo(webProjectTemplate);
      updateMessage(
        "Some magic is happening... This may take a little while...",
      );

      const replacements: Record<string, string> = {
        [`${oldProjectName}.com`]: config.primaryDomain,
        [author]: config.uiUsername,
        [oldProjectName]: config.projectName,
        ["relivator.com"]: config.primaryDomain, // temp extra
      };

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
 * Sets up i18n if `i18nShouldBeEnabledAutomatically` is true,
 * otherwise prompts the user.
 */
export async function setupI18nSupport(
  projectPath: string,
  skipPrompts: boolean,
  i18nShouldBeEnabledAutomatically: boolean,
) {
  let i18nShouldBeEnabled = false;
  if (i18nShouldBeEnabledAutomatically) {
    // We skip the prompt entirely
    await setupI18nFiles(projectPath);
    return;
  }

  // If we aren't auto-enabling, we prompt unless skipPrompts is also true
  if (!skipPrompts) {
    i18nShouldBeEnabled = await confirmPrompt({
      title: "Do you want to enable i18n (internationalization)?",
      displayInstructions: true,
      content: "Option `N` here may not work currently. Please be patient.",
    });
  }

  // Check if i18n folder already exists
  const i18nFolderExists = await fs.pathExists(
    path.join(projectPath, "src/app/[locale]"),
  );
  if (i18nFolderExists) {
    relinka("info-verbose", "i18n is already enabled. No changes needed.");
    return;
  }

  // If user said yes (or if skipPrompts was true but they want i18n anyway)
  if (i18nShouldBeEnabled) {
    await setupI18nFiles(projectPath);
  }
}

/**
 * Installs dependencies and checks for optional DB push scripts.
 */
export async function handleDependencies(
  projectPath: string,
  config: ReliverseConfig,
) {
  const depsBehavior: Behavior = config?.depsBehavior ?? "prompt";

  // Decide if we install deps
  const shouldInstallDeps = await determineShouldInstallDeps(depsBehavior);
  let shouldRunDbPush = false;

  if (shouldInstallDeps) {
    await installDependencies({ cwd: projectPath });
    // Optionally check if there's a db push script
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
 * Decides whether to install deps based on config or user prompt.
 */
export async function determineShouldInstallDeps(
  depsBehavior: Behavior,
): Promise<boolean> {
  switch (depsBehavior) {
    case "autoYes":
      return true;
    case "autoNo":
      return false;
    default:
      return await confirmPrompt({
        title:
          "Would you like me to install dependencies for you? It's recommended, but may take time.",
        content: "This allows me to run scripts provided by the template.",
      });
  }
}

/**
 * Moves the project from a test runtime to a user-specified location (dev mode).
 */
async function moveProjectFromTestRuntime(
  projectName: string,
  sourceDir: string,
): Promise<string | null> {
  try {
    const shouldUseProject = await confirmPrompt({
      title: `Project was bootstrapped in dev mode. Move to permanent location? ${pc.redBright("[🚨 Experimental]")}`,
      content:
        "If yes, I'll move it from the test-runtime directory to a location you choose.",
      defaultValue: false,
    });

    if (!shouldUseProject) {
      return null;
    }

    const defaultPath = getDefaultProjectPath();
    const targetDir = await inputPrompt({
      title: "Where would you like to move the project?",
      content: "Enter a path:",
      placeholder: `Press <Enter> to use default path: ${defaultPath}`,
      defaultValue: defaultPath,
    });

    // Ensure target directory exists
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
        validate: (value: string) => {
          if (!/^[a-zA-Z0-9-_]+$/.test(value)) {
            return "Invalid directory name format";
          }
          return true;
        },
      });

      finalProjectName = newName;
      finalPath = path.join(targetDir, finalProjectName);
      counter++;
    }

    // Move it
    await fs.move(sourceDir, finalPath);
    relinka("success", `Project moved to ${finalPath}`);
    return finalPath;
  } catch (error) {
    relinka("error", "Failed to move project:", String(error));
    return null;
  }
}

/**
 * Gets a default project path based on OS
 */
function getDefaultProjectPath(): string {
  const platform = os.platform();
  if (platform === "win32") {
    return "C:\\B\\S";
  }
  return path.join(os.homedir(), "Projects");
}

/**
 * Handles final deployment steps via the `promptGitDeploy` flow.
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
}): Promise<{
  deployService: DeploymentService | "none";
  primaryDomain: string;
  isDeployed: boolean;
  allDomains: string[];
}> {
  return await promptGitDeploy(params);
}

/**
 * Shows success info, next steps, and handles final user actions (like opening in IDE).
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

  // If dev mode, offer to move the project
  if (isDev) {
    const newPath = await moveProjectFromTestRuntime(
      path.basename(projectPath),
      projectPath,
    );
    if (newPath) {
      finalProjectPath = newPath;
    }
  }

  relinka(
    "info",
    `🎉 ${webProjectTemplate} was installed at ${finalProjectPath}.`,
  );

  const vscodeInstalled = isVSCodeInstalled();

  await nextStepsPrompt({
    title: "🤘 Project created successfully! Next steps:",
    titleColor: "cyanBright",
    content: [
      `- If you have VSCode installed, run: code ${finalProjectPath}`,
      `- Or open in your terminal: cd ${finalProjectPath}`,
      "- Install dependencies manually if needed: bun i OR pnpm i",
      "- Apply linting and formatting: bun check OR pnpm check",
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
    `👋 I'll have more features coming soon! ${
      uiUsername ? `See you soon, ${uiUsername}!` : ""
    }`,
  );

  relinka(
    "success",
    "✨ One more thing (experimental):",
    "👉 Launch `reliverse cli` in your new project to add/remove features.",
  );
}

/**
 * Lets the user select further actions to take, such as opening IDE or docs.
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
 * Handles each requested action from the next-steps prompt.
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
            ? "Opening the project in VSCode-based IDE..."
            : "Trying to open the project in your default IDE...",
        );
        try {
          await execa("code", [projectPath]);
        } catch (error) {
          relinka(
            "error",
            "Error opening project in IDE:",
            error instanceof Error ? error.message : String(error),
            `Try opening manually: code ${projectPath}`,
          );
        }
        break;
      }
      case "deployed": {
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
        break;
    }
  } catch (error) {
    relinka("error", `Error handling action '${action}':`, String(error));
  }
}

/**
 * Checks if specific dependencies exist
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
    return {
      exists: missing.length === 0,
      missing,
    };
  } catch (error: unknown) {
    relinka("error", "Error checking dependencies:", String(error));
    return { exists: false, missing: dependencies };
  }
}

/**
 * Validates certain directories exist
 */
export async function validateProjectStructure(
  projectPath: string,
  requiredPaths: string[] = ["src", "public"],
): Promise<{ isValid: boolean; missing: string[] }> {
  try {
    const missing = [];
    for (const dirPath of requiredPaths) {
      const fullPath = path.join(projectPath, dirPath);
      if (!(await fs.pathExists(fullPath))) {
        missing.push(dirPath);
      }
    }
    return {
      isValid: missing.length === 0,
      missing,
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

    const updatedPackageJson = { ...packageJson, ...updates };
    const packageJsonPath = path.join(projectPath, "package.json");

    await fs.writeJson(packageJsonPath, updatedPackageJson, { spaces: 2 });
    return true;
  } catch (error: unknown) {
    relinka("error", "Error updating package.json:", String(error));
    return false;
  }
}
