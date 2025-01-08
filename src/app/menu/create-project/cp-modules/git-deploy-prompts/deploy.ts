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
  domain: string,
): Promise<DeploymentService | "none"> {
  relinka("info", `Preparing deployment for ${projectName} project...`);

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

    const success = await createVercelDeployment(
      projectName,
      targetDir,
      domain,
    );

    if (success) {
      relinka("success", "Deployment completed!");
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
