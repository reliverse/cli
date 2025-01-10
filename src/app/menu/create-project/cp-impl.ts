import {
  confirmPrompt,
  selectPrompt,
  spinnerTaskPrompt,
} from "@reliverse/prompts";
import {
  multiselectPrompt,
  nextStepsPrompt,
  inputPrompt,
} from "@reliverse/prompts";
import { execa } from "execa";
import fs from "fs-extra";
import { installDependencies } from "nypm";
import open from "open";
import os from "os";
import path from "pathe";
import pc from "picocolors";

import type {
  Behavior,
  DeploymentService,
  ReliverseMemory,
  TemplateOption,
} from "~/types.js";
import type { ReliverseConfig } from "~/utils/reliverseConfig.js";

import { setupI18nFiles } from "~/app/menu/create-project/cp-modules/cli-main-modules/downloads/downloadI18nFiles.js";
import { extractRepoInfo } from "~/app/menu/create-project/cp-modules/cli-main-modules/handlers/extractRepoInfo.js";
import { isVSCodeInstalled } from "~/app/menu/create-project/cp-modules/cli-main-modules/handlers/isAppInstalled.js";
import { promptPackageJsonScripts } from "~/app/menu/create-project/cp-modules/cli-main-modules/handlers/promptPackageJsonScripts.js";
import { replaceStringsInFiles } from "~/app/menu/create-project/cp-modules/cli-main-modules/handlers/replaceStringsInFiles.js";
import { askProjectName } from "~/app/menu/create-project/cp-modules/cli-main-modules/modules/askProjectName.js";
import { askUserName } from "~/app/menu/create-project/cp-modules/cli-main-modules/modules/askUserName.js";
import { promptGitDeploy } from "~/app/menu/create-project/cp-modules/git-deploy-prompts/mod.js";
import { relinka } from "~/utils/loggerRelinka.js";

export type PackageJson = {
  name?: string;
  scripts?: Record<string, string>;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
};

export type CreateWebProjectOptions = {
  webProjectTemplate: TemplateOption;
  message: string;
  mode: "buildBrandNewThing" | "installAnyGitRepo";
  i18nShouldBeEnabled: boolean;
  isDev: boolean;
  config: ReliverseConfig;
  memory: ReliverseMemory;
  cwd: string;
};

export type ProjectConfig = {
  frontendUsername: string;
  projectName: string;
  primaryDomain: string;
};

export async function initializeProjectConfig(
  memory: ReliverseMemory,
  config: ReliverseConfig,
  shouldUseDataFromConfig: boolean,
): Promise<ProjectConfig> {
  const frontendUsername =
    shouldUseDataFromConfig && config?.projectAuthor
      ? config.projectAuthor
      : ((await askUserName(memory)) ?? "");

  const projectName =
    shouldUseDataFromConfig && config?.projectTemplate
      ? path.basename(config.projectTemplate)
      : ((await askProjectName()) ?? "");

  const primaryDomain =
    shouldUseDataFromConfig && config?.projectDomain
      ? config.projectDomain
      : `${projectName}.vercel.app`;

  return { frontendUsername, projectName, primaryDomain };
}

export async function replaceTemplateStrings(
  projectPath: string,
  webProjectTemplate: TemplateOption,
  config: ProjectConfig,
) {
  await spinnerTaskPrompt({
    spinnerSolution: "ora",
    initialMessage: "Editing some texts in the initialized files...",
    successMessage: "✅ I edited some texts in the initialized files for you.",
    errorMessage:
      "❌ I've failed to edit some texts in the initialized files...",
    async action(updateMessage: (message: string) => void) {
      const { author, projectName: oldProjectName } =
        extractRepoInfo(webProjectTemplate);
      updateMessage("Some magic is happening... This may take a while...");

      const replacements: Record<string, string> = {
        [`${oldProjectName}.com`]: config.primaryDomain,
        [author]: config.frontendUsername,
        [oldProjectName]: config.projectName,
        ["relivator.com"]: config.primaryDomain,
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

export async function setupI18nSupport(
  projectPath: string,
  config: ReliverseConfig,
  shouldUseDataFromConfig: boolean,
) {
  const i18nShouldBeEnabled =
    shouldUseDataFromConfig && config?.features?.i18n !== undefined
      ? config.features.i18n
      : await confirmPrompt({
          title:
            "Do you want to enable i18n (internationalization) for this project?",
          displayInstructions: true,
          content: "Option `N` here may not work currently. Please be patient.",
        });

  const i18nFolderExists = await fs.pathExists(
    path.join(projectPath, "src/app/[locale]"),
  );

  if (i18nFolderExists) {
    relinka("info-verbose", "i18n is already enabled. No changes needed.");
    return;
  }

  if (i18nShouldBeEnabled) {
    await setupI18nFiles(projectPath);
  }
}

export async function handleDependencies(
  projectPath: string,
  config: ReliverseConfig,
) {
  const depsBehavior: Behavior = config?.depsBehavior ?? "prompt";

  const shouldInstallDeps = await determineShouldInstallDeps(depsBehavior);
  let shouldRunDbPush = false;

  if (shouldInstallDeps) {
    await installDependencies({ cwd: projectPath });
    const scriptStatus = await promptPackageJsonScripts(
      projectPath,
      shouldRunDbPush,
      true,
    );
    shouldRunDbPush = scriptStatus.dbPush;
  }

  return { shouldInstallDeps, shouldRunDbPush };
}

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
          "Would you like me to install dependencies for you? It's highly recommended, but may take some time.",
        content: "This allows me to run scripts provided by the template.",
      });
  }
}

function getDefaultProjectPath(): string {
  const platform = os.platform();
  if (platform === "win32") {
    return "C:\\B\\S";
  } else {
    return path.join(os.homedir(), "Projects");
  }
}

async function moveProjectFromTestRuntime(
  projectName: string,
  sourceDir: string,
): Promise<string | null> {
  try {
    const shouldUseProject = await confirmPrompt({
      title: `The project was bootstrapped using dev mode. Do you plan to use this project? ${pc.redBright("[🚨 Experimental]")}`,
      content:
        "If yes, I'll try to move it from the test-runtime directory to a permanent location.",
      defaultValue: false,
    });

    if (!shouldUseProject) {
      return null;
    }

    const defaultPath = getDefaultProjectPath();
    const projectPath = await inputPrompt({
      title: "Where would you like to move the project?",
      content: "Enter the path where you want to move the project:",
      placeholder: `Press <Enter> to use the default path: ${defaultPath}`,
      defaultValue: defaultPath,
    });

    // Ensure target directory exists
    await fs.ensureDir(projectPath);

    // Check if a directory with the same name exists
    let finalProjectName = projectName;
    const originalTargetPath = path.join(projectPath, projectName);
    let targetPath = originalTargetPath;
    let counter = 1;

    while (await fs.pathExists(targetPath)) {
      const newName = await inputPrompt({
        title: `Directory ${finalProjectName} already exists at ${projectPath}`,
        content: "Please enter a new name for the project directory",
        defaultValue: `${projectName}-${counter}`,
        validate: (value: string) => {
          if (!/^[a-zA-Z0-9-_]+$/.test(value))
            return "Invalid directory name format";
          return true;
        },
      });

      finalProjectName = newName;
      targetPath = path.join(projectPath, finalProjectName);
      counter++;
    }

    // Move the project
    await fs.move(sourceDir, targetPath);
    relinka("success", `Project moved to ${targetPath}`);
    return targetPath;
  } catch (error) {
    relinka(
      "error",
      "Failed to move project:",
      error instanceof Error ? error.message : String(error),
    );
    return null;
  }
}

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
}): Promise<{
  deployService: DeploymentService | "none";
  primaryDomain: string;
  isDeployed: boolean;
  allDomains: string[];
}> {
  return await promptGitDeploy(params);
}

export async function showSuccessAndNextSteps(
  projectPath: string,
  webProjectTemplate: TemplateOption,
  frontendUsername: string,
  isDeployed: boolean,
  primaryDomain: string,
  allDomains: string[],
  isDev: boolean,
) {
  let finalProjectPath = projectPath;

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
    `🎉 ${webProjectTemplate} was successfully installed to ${finalProjectPath}.`,
  );

  const vscodeInstalled = isVSCodeInstalled();

  await nextStepsPrompt({
    title: "🤘 Project created successfully! Next steps to get started:",
    titleColor: "cyanBright",
    content: [
      `- If you have VSCode installed, run: code ${finalProjectPath}`,
      `- You can open the project in your terminal: cd ${finalProjectPath}`,
      "- Install dependencies manually if needed: bun i OR pnpm i",
      "- Apply linting and formatting: bun check OR pnpm check",
      "- Run the project: bun dev OR pnpm dev",
    ],
  });

  await handleNextActions(
    finalProjectPath,
    vscodeInstalled,
    frontendUsername,
    isDeployed,
    primaryDomain,
    allDomains,
  );
}

export async function handleNextActions(
  projectPath: string,
  vscodeInstalled: boolean,
  frontendUsername: string,
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
    `👋 I'll have some more features coming soon! ${frontendUsername ? `See you soon, ${frontendUsername}!` : ""}`,
  );

  relinka(
    "success",
    "✨ One more thing to try (experimental):",
    "👉 Launch `reliverse cli` in your new project to add/remove features.",
  );
}

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
            "Error opening project in your IDE:",
            error instanceof Error ? error.message : String(error),
            `Try to open the project manually with command like: code ${projectPath}`,
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
        await open("https://docs.reliverse.org");
        break;
      }
    }
  } catch (error) {
    relinka("error", `Error handling action ${action}:`, String(error));
  }
}

/**
 * Checks if a specific script exists in package.json
 */
export async function checkScriptExists(
  projectPath: string,
  scriptName: string,
): Promise<boolean> {
  try {
    const packageJson = await readPackageJson(projectPath);
    return !!packageJson?.scripts?.[scriptName];
  } catch (error: unknown) {
    relinka(
      "error",
      `Error checking for script ${scriptName}:`,
      error instanceof Error ? error.message : String(error),
    );
    return false;
  }
}

/**
 * Reads and parses package.json file
 */
export async function readPackageJson(
  projectPath: string,
): Promise<PackageJson | null> {
  const packageJsonPath = path.join(projectPath, "package.json");
  try {
    if (await fs.pathExists(packageJsonPath)) {
      return await fs.readJson(packageJsonPath);
    }
    return null;
  } catch (error: unknown) {
    relinka(
      "error",
      "Error reading package.json:",
      error instanceof Error ? error.message : String(error),
    );
    return null;
  }
}

/**
 * Checks if specific dependencies exist in package.json
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
    relinka(
      "error",
      "Error checking dependencies:",
      error instanceof Error ? error.message : String(error),
    );
    return { exists: false, missing: dependencies };
  }
}

/**
 * Validates project directory structure
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
    relinka(
      "error",
      "Error validating project structure:",
      error instanceof Error ? error.message : String(error),
    );
    return { isValid: false, missing: requiredPaths };
  }
}

/**
 * Updates package.json with new values
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
    relinka(
      "error",
      "Error updating package.json:",
      error instanceof Error ? error.message : String(error),
    );
    return false;
  }
}
