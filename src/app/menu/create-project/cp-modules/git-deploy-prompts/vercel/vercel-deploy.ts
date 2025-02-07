import { relinka, relinkaAsync } from "@reliverse/prompts";
import { deploymentsCreateDeployment } from "@vercel/sdk/funcs/deploymentsCreateDeployment.js";
import { deploymentsGetDeployment } from "@vercel/sdk/funcs/deploymentsGetDeployment.js";
import { deploymentsGetDeploymentEvents } from "@vercel/sdk/funcs/deploymentsGetDeploymentEvents.js";
import { simpleGit } from "simple-git";

import type { InstanceVercel } from "~/utils/instanceVercel.js";
import type { ReliverseMemory } from "~/utils/schemaMemory.js";

import { type InstanceGithub } from "~/utils/instanceGithub.js";

import type { DeploymentLog, VercelDeploymentConfig } from "./vercel-types.js";

import { withRateLimit } from "./vercel-api.js";
import { getPrimaryVercelTeam } from "./vercel-team.js";

/**
 * Monitors the deployment logs until the deployment reaches a READY state.
 */
export async function monitorDeployment(
  vercelInstance: InstanceVercel,
  deploymentId: string,
  teamId: string,
  slug: string,
  showDetailedLogs = false,
): Promise<void> {
  try {
    const logsRes = await deploymentsGetDeploymentEvents(vercelInstance, {
      idOrUrl: deploymentId,
      teamId,
      slug,
    });
    if (!logsRes.ok) throw logsRes.error;
    const logs = logsRes.value;
    if (Array.isArray(logs)) {
      let errors = 0;
      let warnings = 0;
      for (const log of logs as DeploymentLog[]) {
        const timestamp = new Date(log.created).toLocaleTimeString();
        const message = `[${log.type}] ${log.text}`;
        if (log.type === "error") {
          errors++;
          relinka("error", `${timestamp}: ${message}`);
        } else if (log.type === "warning") {
          warnings++;
          relinka("warn", `${timestamp}: ${message}`);
        } else if (showDetailedLogs) {
          relinka("info", `${timestamp}: ${message}`);
        }
      }
      if (errors > 0 || warnings > 0) {
        relinka(
          "info",
          `Deployment summary: ${errors} errors, ${warnings} warnings`,
        );
      }
    }
  } catch (error) {
    relinka(
      "error",
      "Error monitoring deployment:",
      error instanceof Error ? error.message : String(error),
    );
  }
}

/**
 * Creates the initial Vercel deployment for a project.
 * This function now fixes the gitSource information by:
 * 1. Retrieving the local HEAD commit SHA.
 * 2. Using Octokit (via the GitHub token) to get the repository's numeric ID.
 */
export async function createInitialVercelDeployment(
  githubInstance: InstanceGithub,
  vercelInstance: InstanceVercel,
  projectId: string,
  memory: ReliverseMemory,
  projectName: string,
  config: VercelDeploymentConfig,
  selectedOptions: { includes: (option: string) => boolean },
  githubUsername: string,
  githubToken: string,
): Promise<{ url: string; id: string }> {
  if (!githubToken) {
    throw new Error(
      "GitHub token not found in Reliverse's memory. Please restart the CLI and try again. Notify the @reliverse/cli developers if the problem persists.",
    );
  }

  relinka("info", "Creating the initial deployment...");
  relinka(
    "info-verbose",
    "Using Vercel deployment config:",
    JSON.stringify(config),
  );

  // Retrieve primary team details.
  const vercelTeam = await getPrimaryVercelTeam(vercelInstance, memory);
  if (!vercelTeam) throw new Error("No Vercel team found.");
  const teamId = vercelTeam.id;
  const slug = vercelTeam.slug;

  // Retrieve the local HEAD commit SHA.
  const git = simpleGit();
  let commitSha: string;
  try {
    commitSha = await git.revparse(["HEAD"]);
  } catch (error) {
    throw new Error(
      `Failed to get local commit SHA. Ensure the repository is not empty. ${error}`,
    );
  }

  // Fetch numeric GitHub repository ID using Octokit.
  let numericRepoId: number;
  try {
    const repoResp = await githubInstance.rest.repos.get({
      owner: githubUsername,
      repo: projectName,
    });
    numericRepoId = repoResp.data.id;
  } catch (error) {
    throw new Error(`Failed to fetch GitHub repository numeric ID. ${error}`);
  }

  // Create the deployment with a valid gitSource.
  const deploymentRes = await withRateLimit(async () => {
    return await deploymentsCreateDeployment(vercelInstance, {
      teamId,
      slug,
      requestBody: {
        name: projectName,
        target: "production",
        project: projectId,
        gitSource: {
          type: "github",
          ref: "main",
          repoId: numericRepoId,
          sha: commitSha,
        },
      },
    });
  });
  if (!deploymentRes.ok) throw deploymentRes.error;
  const deployment = deploymentRes.value;
  if (!deployment?.id || !deployment.readyState || !deployment.url) {
    throw new Error(
      "Failed to create deployment: invalid response from Vercel",
    );
  }

  // Monitor deployment progress.
  const inProgressStates = ["BUILDING", "INITIALIZING", "QUEUED"] as const;
  const deploymentUrl = slug
    ? `https://vercel.com/${slug}/${projectName}/${deployment.id}`
    : "https://vercel.com";
  relinka(
    "info",
    `Deployment started. To monitor progress, visit: ${deploymentUrl}`,
    "Status messages will appear every 10 seconds.",
  );

  let lastMessageTime = Date.now();
  let status = deployment.readyState;
  while (inProgressStates.includes(status)) {
    await monitorDeployment(
      vercelInstance,
      deployment.id,
      teamId,
      slug,
      selectedOptions.includes("monitoring"),
    );
    await new Promise((resolve) => setTimeout(resolve, 5000));
    const depRes = await withRateLimit(async () => {
      return await deploymentsGetDeployment(vercelInstance, {
        idOrUrl: deployment.id,
        teamId,
        slug,
      });
    });
    if (!depRes.ok) throw depRes.error;
    status = depRes.value.readyState;
    const now = Date.now();
    if (now - lastMessageTime >= 10000) {
      await relinkaAsync(
        "info",
        `Deployment status: ${status}`,
        undefined,
        undefined,
        { delay: 50, useSpinner: true, spinnerDelay: 50 },
      );
      lastMessageTime = now;
    }
  }
  if (status !== "READY") {
    await monitorDeployment(
      vercelInstance,
      deployment.id,
      teamId,
      slug,
      selectedOptions.includes("monitoring"),
    );
    throw new Error(`Deployment failed with status: ${status}`);
  }
  await monitorDeployment(
    vercelInstance,
    deployment.id,
    teamId,
    slug,
    selectedOptions.includes("monitoring"),
  );
  return { url: deployment.url, id: deployment.id };
}
