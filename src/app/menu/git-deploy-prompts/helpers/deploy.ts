import { selectPrompt } from "@reliverse/prompts";
import pc from "picocolors";

import type { DeploymentService, ReliverseConfig } from "~/types.js";

import { readReliverseMemory } from "~/args/memory/impl.js";
import { relinka } from "~/utils/console.js";

import { createVercelDeployment } from "./vercel.js";

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
      { label: "Vercel (Recommended)", value: "Vercel" },
      { label: "...", value: "none", hint: pc.dim("coming soon") },
    ],
    defaultValue: "Vercel",
  });
}

export async function deployProject(
  projectName: string,
  config: ReliverseConfig,
  targetDir: string,
  domain = "",
): Promise<boolean> {
  try {
    const shouldUseDataFromConfig =
      config?.experimental?.skipPromptsUseAutoBehavior ?? false;

    const deployService = await selectDeploymentService(config);
    if (deployService === "none") {
      relinka("info", "No deployment service selected. Skipping deployment.");
      return false;
    }

    const memory = await readReliverseMemory();
    if (!memory) {
      relinka("error", "Failed to read reliverse memory");
      return false;
    }

    if (deployService === "Vercel") {
      const { askGithubName } = await import("~/app/menu/askGithubName.js");
      const { askVercelName } = await import("~/app/menu/askVercelName.js");

      const githubUsername =
        shouldUseDataFromConfig && memory.githubUsername
          ? memory.githubUsername
          : await askGithubName();
      const vercelUsername =
        shouldUseDataFromConfig && memory.vercelUsername
          ? memory.vercelUsername
          : await askVercelName();

      await createVercelDeployment(
        targetDir,
        projectName,
        githubUsername,
        vercelUsername,
        domain,
      );
      return true;
    }

    relinka("info", `Deployment to ${deployService} is not yet implemented.`);
    return false;
  } catch (error) {
    relinka(
      "error",
      "Error deploying project:",
      error instanceof Error ? error.message : String(error),
    );
    return false;
  }
}
