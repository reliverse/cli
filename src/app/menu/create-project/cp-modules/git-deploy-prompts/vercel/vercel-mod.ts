import { relinka } from "@reliverse/prompts";

import type { ReliverseMemory } from "~/utils/schemaMemory.js";

import { createOctokitInstance } from "~/app/menu/create-project/cp-modules/git-deploy-prompts/octokit-instance.js";

import { createVercelInstance } from "./vercel-client.js";
import { verifyTeam } from "./vercel-team.js";

export type InlinedFile = {
  file: string;
  data: string;
  encoding: "utf-8" | "base64";
};

/**
 * Checks if a project is already deployed to Vercel
 */
export async function isProjectDeployed(
  projectName: string,
  githubUsername: string,
  memory: ReliverseMemory,
): Promise<{
  isDeployed: boolean;
  githubUsername?: string | undefined;
  vercelTeamSlug?: string | undefined;
}> {
  try {
    if (!memory?.githubKey) {
      relinka("error-verbose", "GitHub token not found in Reliverse's memory");
      return { isDeployed: false };
    }

    if (!githubUsername) {
      relinka("error", "Could not determine GitHub username");
      return { isDeployed: false };
    }

    // Get Vercel team slug if token exists
    let vercelTeamSlug: string | undefined;
    if (memory.vercelKey) {
      try {
        const vercel = createVercelInstance(memory.vercelKey);
        if (memory.vercelTeamId && memory.vercelTeamSlug) {
          const isTeamValid = await verifyTeam(
            vercel,
            memory.vercelTeamId,
            memory.vercelTeamSlug,
          );
          if (isTeamValid) {
            vercelTeamSlug = memory.vercelTeamSlug;
          }
        }
      } catch (err) {
        relinka(
          "error",
          "Could not verify Vercel team:",
          err instanceof Error ? err.message : String(err),
        );
      }
    }

    const octokit = createOctokitInstance(memory.githubKey);

    try {
      // Check for Vercel deployments in GitHub
      const { data: deployments } = await octokit.rest.repos.listDeployments({
        owner: githubUsername,
        repo: projectName,
      });

      return {
        isDeployed: deployments.length > 0,
        githubUsername,
        vercelTeamSlug,
      };
    } catch (err) {
      relinka(
        "error-verbose",
        "Failed to check deployments:",
        err instanceof Error ? err.message : String(err),
      );
      return { isDeployed: false, githubUsername, vercelTeamSlug };
    }
  } catch (err) {
    relinka(
      "error-verbose",
      "Failed to check if project is deployed:",
      err instanceof Error ? err.message : String(err),
    );
    return { isDeployed: false };
  }
}
