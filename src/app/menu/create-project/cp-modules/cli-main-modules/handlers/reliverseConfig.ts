import type { DeploymentService } from "~/types.js";

import { relinka } from "~/app/menu/create-project/cp-modules/cli-main-modules/handlers/logger.js";
import {
  readReliverseMemory,
  updateReliverseMemory,
} from "~/args/memory/impl.js";

import {
  getDefaultReliverseConfig,
  writeReliverseConfig,
} from "../configs/reliverseReadWrite.js";

type GenerateReliverseFileOptions = {
  projectName: string;
  frontendUsername: string;
  deployService: DeploymentService;
  primaryDomain: string;
  targetDir: string;
  i18nShouldBeEnabled: boolean;
  shouldInstallDeps: boolean;
  isDeployed: boolean;
};

export async function generateReliverseFile({
  projectName,
  frontendUsername,
  deployService,
  primaryDomain,
  targetDir,
  i18nShouldBeEnabled,
  shouldInstallDeps,
}: GenerateReliverseFileOptions): Promise<boolean> {
  try {
    const memory = await readReliverseMemory();
    const rules = await getDefaultReliverseConfig(
      projectName ?? "my-app",
      frontendUsername ?? "user",
    );

    const githubUsername = memory?.githubUsername ?? "";
    const vercelTeamName = memory?.vercelUsername ?? "";

    // Store updated info in memory
    await updateReliverseMemory({
      name: frontendUsername,
      githubUsername,
      vercelUsername: vercelTeamName,
    });

    // Configure features
    if (!rules.experimental) {
      rules.experimental = {};
    }
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

    rules.experimental.projectRepository = `https://github.com/${githubUsername}/${projectName}`;
    rules.experimental.projectDeployService = deployService;
    rules.experimental.projectDomain = primaryDomain
      ? `https://${primaryDomain}`
      : `https://${projectName}.${deployService.toLowerCase()}.app`;
    rules.experimental.gitBehavior = "prompt";

    // Write the configuration
    await writeReliverseConfig(targetDir, rules);
    relinka(
      "success-verbose",
      "Generated .reliverse with project-specific settings",
    );

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
