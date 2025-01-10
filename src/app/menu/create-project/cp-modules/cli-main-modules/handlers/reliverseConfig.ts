import destr from "destr";
import fs from "fs-extra";
import path from "pathe";

import type {
  DeploymentService,
  ReliverseConfig,
  ReliverseMemory,
} from "~/types.js";

import { updateReliverseMemory } from "~/app/app-utils.js";
import { relinka } from "~/app/menu/create-project/cp-modules/cli-main-modules/handlers/logger.js";

import { DEFAULT_CONFIG } from "../configs/reliverseDefaultConfig.js";
import {
  getDefaultReliverseConfig,
  writeReliverseConfig,
} from "../configs/reliverseReadWrite.js";

type GenerateReliverseFileOptions = {
  projectName: string;
  frontendUsername: string;
  deployService: DeploymentService;
  primaryDomain: string;
  projectPath: string;
  i18nShouldBeEnabled: boolean;
  shouldInstallDeps: boolean;
  isDeployed?: boolean;
  overwrite?: boolean;
  memory: ReliverseMemory;
};

export async function generateReliverseFile({
  projectName,
  frontendUsername,
  deployService,
  primaryDomain,
  projectPath,
  i18nShouldBeEnabled,
  shouldInstallDeps,
  overwrite,
  memory,
}: GenerateReliverseFileOptions): Promise<boolean> {
  try {
    // Read memory to get stored usernames
    const githubUsername = memory?.githubUsername ?? "";
    const vercelTeamName = memory?.vercelUsername ?? "";

    // Load default config rules
    const rules = await getDefaultReliverseConfig(
      projectName || "my-app",
      frontendUsername || "user",
    );

    // Store updated info in memory
    await updateReliverseMemory({
      name: frontendUsername,
      githubUsername,
      vercelUsername: vercelTeamName,
    });

    // Configure 'experimental' block if missing
    if (!rules.experimental) {
      rules.experimental = {};
    }

    // Attach project details
    rules.experimental.projectName = projectName;
    rules.experimental.projectAuthor = frontendUsername;
    rules.experimental.projectRepository = `https://github.com/${githubUsername}/${projectName}`;
    rules.experimental.projectDeployService = deployService;
    rules.experimental.projectDomain = primaryDomain
      ? `https://${primaryDomain}`
      : `https://${projectName}.${deployService.toLowerCase()}.app`;

    // Features
    rules.experimental.features = {
      ...rules.experimental.features,
      i18n: i18nShouldBeEnabled,
      authentication: shouldInstallDeps,
      database: shouldInstallDeps,
      analytics: false,
      themeMode: "dark-light",
      api: shouldInstallDeps,
      testing: true,
      docker: false,
      ci: true,
      commands: [],
      webview: [],
      language: ["typescript"],
      themes: ["default"],
    };

    // Dev preferences
    rules.experimental.gitBehavior = "prompt";
    rules.experimental.deployBehavior = "prompt";
    rules.experimental.depsBehavior = "prompt";
    rules.experimental.i18nBehavior = "prompt";
    rules.experimental.scriptsBehavior = "prompt";
    rules.experimental.skipPromptsUseAutoBehavior = false;

    // Prepare a flattened config object merged with DEFAULT_CONFIG
    const configContent: ReliverseConfig = { ...DEFAULT_CONFIG };

    // Flatten relevant fields from rules into configContent
    Object.assign(configContent, {
      // Project details
      projectName: rules.experimental.projectName,
      projectAuthor: rules.experimental.projectAuthor,
      projectDescription: rules.experimental.projectDescription,
      projectVersion: rules.experimental.projectVersion,
      projectLicense: rules.experimental.projectLicense,
      projectRepository: rules.experimental.projectRepository,
      features: rules.experimental.features,

      // Development preferences
      projectFramework: rules.experimental.projectFramework,
      projectFrameworkVersion: rules.experimental.projectFrameworkVersion,
      nodeVersion: rules.experimental.nodeVersion,
      runtime: rules.experimental.runtime,
      projectPackageManager: rules.experimental.projectPackageManager,
      monorepo: rules.experimental.monorepo,
      preferredLibraries: rules.experimental.preferredLibraries,
      codeStyle: rules.experimental.codeStyle,
    });

    // Define the path for .reliverse
    const configPath = path.join(projectPath, ".reliverse");

    // If overwrite is requested, always write fresh
    if (overwrite) {
      await writeReliverseConfig(projectPath, configContent);
      relinka(
        "success-verbose",
        "Overwrote existing .reliverse with new config",
      );
      return true;
    }

    // Otherwise, merge if .reliverse exists or create new
    const configExists = await fs.pathExists(configPath);

    if (configExists) {
      try {
        const existingContent = destr(await fs.readFile(configPath, "utf-8"));
        if (existingContent && typeof existingContent === "object") {
          const mergedContent = {
            ...configContent,
            ...(existingContent as ReliverseConfig),
            experimental: {
              ...(existingContent as ReliverseConfig).experimental,
              ...configContent?.experimental,
            },
          };
          await writeReliverseConfig(projectPath, mergedContent);
          relinka(
            "success-verbose",
            "Updated existing .reliverse with merged config",
          );
        }
      } catch (error) {
        relinka(
          "warn-verbose",
          "Error reading existing .reliverse, creating new one",
          error instanceof Error ? error.message : String(error),
        );
        await writeReliverseConfig(projectPath, configContent);
      }
    } else {
      await writeReliverseConfig(projectPath, configContent);
      relinka(
        "success-verbose",
        "Generated .reliverse with project-specific settings",
      );
    }

    return true;
  } catch (error) {
    relinka(
      "error",
      "Failed to configure reliverse:",
      error instanceof Error ? error.message : String(error),
    );
    return false;
  }
}
