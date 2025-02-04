import { relinka } from "@reliverse/prompts";

import type { ReliverseMemory } from "~/utils/schemaMemory.js";

import { createOctokitInstance } from "~/app/menu/create-project/cp-modules/git-deploy-prompts/octokit-instance.js";

export type InlinedFile = {
  file: string;
  data: string;
  encoding: "utf-8" | "base64";
};

/**
 * Checks if a project is already deployed to Vercel
 */
export async function isRepoHasDeployments(
  projectName: string,
  githubUsername: string,
  memory: ReliverseMemory,
): Promise<boolean> {
  try {
    if (!memory?.githubKey) {
      relinka("error-verbose", "GitHub token not found in Reliverse's memory");
      return false;
    }

    if (!githubUsername) {
      relinka("error", "Could not determine GitHub username");
      return false;
    }

    const octokit = createOctokitInstance(memory.githubKey);

    try {
      // Check for Vercel deployments in GitHub
      const { data: deployments } = await octokit.rest.repos.listDeployments({
        owner: githubUsername,
        repo: projectName,
      });

      return deployments.length > 0;
    } catch (err) {
      relinka(
        "error-verbose",
        "Failed to check deployments:",
        err instanceof Error ? err.message : String(err),
      );
      return false;
    }
  } catch (err) {
    relinka(
      "error-verbose",
      "Failed to check if project is deployed:",
      err instanceof Error ? err.message : String(err),
    );
    return false;
  }
}
