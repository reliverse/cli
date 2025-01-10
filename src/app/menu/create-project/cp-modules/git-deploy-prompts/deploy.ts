import { selectPrompt } from "@reliverse/prompts";
import pc from "picocolors";

import type { DeploymentService, ReliverseMemory } from "~/types.js";
import type { ReliverseConfig } from "~/utils/reliverseConfig.js";

import { relinka } from "~/utils/loggerRelinka.js";

import { createVercelDeployment } from "./vercel/vercel-mod.js";

export async function selectDeploymentService(
  config: ReliverseConfig,
): Promise<DeploymentService> {
  if (
    config.projectDeployService !== undefined &&
    config.projectDeployService !== "none"
  ) {
    const deployService = config.projectDeployService;
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
  projectPath: string,
  primaryDomain: string,
  memory: ReliverseMemory,
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
      projectPath,
      primaryDomain,
      memory,
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
