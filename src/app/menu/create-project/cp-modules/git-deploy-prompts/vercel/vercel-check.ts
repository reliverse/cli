import { relinka } from "@reliverse/prompts";

import { type InstanceGithub } from "~/utils/instanceGithub.js";

export type InlinedFile = {
  file: string;
  data: string;
  encoding: "utf-8" | "base64";
};

/**
 * Checks whether there is an existing deployment for the given project.
 *
 * It validates that the GitHub token exists in memory and that a GitHub
 * username is provided, then uses Octokit to list deployments.
 *
 * @param projectName - The name of the project/repository.
 * @param githubUsername - The GitHub username (owner).
 * @param githubToken - The GitHub token.
 *
 * @returns True if at least one deployment is found; false otherwise.
 */
export async function checkVercelDeployment(
  projectName: string,
  githubUsername: string,
  githubToken: string,
  githubInstance: InstanceGithub,
): Promise<boolean> {
  relinka("info-verbose", "Checking for existing deployment...");

  if (!githubToken) {
    relinka(
      "error",
      "GitHub token not found in Reliverse's memory. Please restart the CLI and try again. Notify the @reliverse/cli developers if the problem persists.",
    );
    return false;
  }
  if (!githubUsername || githubUsername.trim() === "") {
    relinka("error", "GitHub username is missing");
    return false;
  }

  try {
    const { data: deployments } =
      await githubInstance.rest.repos.listDeployments({
        owner: githubUsername,
        repo: projectName,
      });
    return deployments.length > 0;
  } catch (error) {
    relinka(
      "error",
      "Failed to check Vercel deployments:",
      error instanceof Error ? error.message : String(error),
    );
    return false;
  }
}
