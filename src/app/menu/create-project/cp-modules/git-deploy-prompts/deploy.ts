import { selectPrompt } from "@reliverse/prompts";
import pc from "picocolors";

import type { DeploymentService, ReliverseConfig } from "~/types.js";

import { relinka } from "~/app/menu/create-project/cp-modules/cli-main-modules/handlers/logger.js";

import { createVercelDeployment } from "./vercel/vercel-mod.js";

export async function selectDeploymentService(
  config: ReliverseConfig,
): Promise<DeploymentService> {
  if (
    config?.experimental?.projectDeployService &&
    config.experimental.projectDeployService !== "none"
  ) {
    const deployService = config.experimental.projectDeployService;
    relinka("info", `Using configured deployment service: ${deployService}`);
    return deployService;
  }

  return await selectPrompt<DeploymentService>({
    title: "Select deployment service",
    options: [
      { label: "Vercel", value: "vercel", hint: "recommended" },
      { label: "None", value: "none", hint: "skip deployment" },
      {
        label: "...",
        value: "deno",
        hint: pc.dim("coming soon"),
        disabled: true,
      },
    ],
    defaultValue: "vercel",
  });
}

export async function deployProject(
  projectName: string,
  config: ReliverseConfig,
  targetDir: string,
  primaryDomain: string,
): Promise<{
  deployService: DeploymentService | "none";
  primaryDomain: string;
  isDeployed: boolean;
  allDomains: string[];
}> {
  relinka("info", `Preparing deployment for ${projectName} project...`);

  try {
    const deployService = await selectDeploymentService(config);
    if (deployService === "none") {
      relinka("info", "Skipping deployment...");
      return {
        primaryDomain,
        deployService: "none",
        isDeployed: false,
        allDomains: [primaryDomain],
      };
    }

    if (deployService !== "vercel") {
      relinka("info", `Deployment to ${deployService} is not yet implemented`);
      return {
        primaryDomain,
        deployService: "none",
        isDeployed: false,
        allDomains: [primaryDomain],
      };
    }

    const success = await createVercelDeployment(
      projectName,
      targetDir,
      primaryDomain,
    );

    if (success) {
      relinka("success", "Deployment completed!");
      return {
        primaryDomain,
        deployService: deployService,
        isDeployed: true,
        allDomains: [primaryDomain],
      };
    } else {
      relinka("error", "Failed to deploy project");
      return {
        primaryDomain,
        deployService: "none",
        isDeployed: false,
        allDomains: [primaryDomain],
      };
    }
  } catch (error) {
    relinka(
      "error",
      "Error during deployment:",
      error instanceof Error ? error.message : String(error),
    );
    return {
      primaryDomain,
      deployService: "none",
      isDeployed: false,
      allDomains: [primaryDomain],
    };
  }
}
