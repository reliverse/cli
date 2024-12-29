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
  domain = "",
): Promise<DeploymentService | "none"> {
  try {
    const deployService = await selectDeploymentService(config);
    if (deployService === "none") {
      relinka("info", "No deployment service selected. Skipping deployment.");
      return "none";
    }

    const memory = await readReliverseMemory();
    if (!memory) {
      relinka("error", "Failed to read reliverse memory");
      return "none";
    }

    if (deployService === "vercel") {
      const { askGithubName } = await import("~/app/menu/askGithubName.js");
      const githubUsername = memory.githubUsername
        ? memory.githubUsername
        : await askGithubName();

      const { askVercelName } = await import("~/app/menu/askVercelName.js");
      const vercelUsername = memory.vercelUsername
        ? memory.vercelUsername
        : await askVercelName();

      if (!githubUsername || !vercelUsername) {
        relinka("error", "Could not determine GitHub or Vercel username");
        return "none";
      }

      await createVercelDeployment(
        targetDir,
        projectName,
        githubUsername,
        vercelUsername,
        domain,
      );
      return "vercel";
    }

    relinka("info", `Deployment to ${deployService} is not yet implemented.`);
    return "none";
  } catch (error) {
    relinka(
      "error",
      "Error deploying project:",
      error instanceof Error ? error.message : String(error),
    );
    return "none";
  }
}
