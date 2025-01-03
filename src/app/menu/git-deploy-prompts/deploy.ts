import { selectPrompt } from "@reliverse/prompts";
import pc from "picocolors";

import type { DeploymentService, ReliverseConfig } from "~/types.js";

import { relinka } from "~/utils/console.js";

import { promptForDomain } from "./helpers/promptForDomain.js";
import {
  createVercelDeployment,
  isProjectDeployed,
} from "./vercel/vercel-mod.js";

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
): Promise<DeploymentService | "none"> {
  relinka("info", `Trying to prepare deployment for ${projectName} project...`);

  try {
    const deployService = await selectDeploymentService(config);
    if (deployService === "none") {
      relinka("info", "Skipping deployment...");
      return "none";
    }

    if (deployService !== "vercel") {
      relinka("info", `Deployment to ${deployService} is not yet implemented`);
      return "none";
    }

    // Check if project is already deployed
    const isDeployed = await isProjectDeployed(projectName);

    if (isDeployed) {
      relinka(
        "info",
        "Existing deployment found. Proceeding with deployment update...",
      );
    } else {
      relinka(
        "info",
        "No existing deployment found. Initializing new deployment...",
      );
    }

    // Get domain configuration
    const domain = await promptForDomain(projectName);

    const success = await createVercelDeployment(
      projectName,
      targetDir,
      domain,
    );

    if (success) {
      relinka(
        "success",
        isDeployed
          ? "Deployment updated successfully!"
          : "New deployment created successfully!",
      );
      return deployService;
    } else {
      relinka("error", "Failed to deploy project");
      return "none";
    }
  } catch (error) {
    relinka(
      "error",
      "Error during deployment:",
      error instanceof Error ? error.message : String(error),
    );
    return "none";
  }
}
