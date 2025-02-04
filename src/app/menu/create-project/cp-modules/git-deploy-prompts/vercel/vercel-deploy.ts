import type { VercelCore } from "@vercel/sdk/core.js";
import type { InlinedFile } from "@vercel/sdk/models/createdeploymentop.js";

import { relinka, relinkaAsync } from "@reliverse/prompts";
import { deploymentsCreateDeployment } from "@vercel/sdk/funcs/deploymentsCreateDeployment.js";
import { deploymentsGetDeployment } from "@vercel/sdk/funcs/deploymentsGetDeployment.js";
import { deploymentsGetDeploymentEvents } from "@vercel/sdk/funcs/deploymentsGetDeploymentEvents.js";
import { projectsCreateProject } from "@vercel/sdk/funcs/projectsCreateProject.js";
import fs from "fs-extra";
import path from "pathe";

import type { ReliverseMemory } from "~/utils/schemaMemory.js";

import type {
  DeploymentLog,
  DeploymentOptions,
  VercelDeploymentConfig,
} from "./vercel-types.js";

import { withRateLimit } from "./vercel-api.js";
import { handleEnvironmentVariables } from "./vercel-env.js";
import { getPrimaryVercelTeam } from "./vercel-team.js";

/**
 * Checks if a file is binary
 */
function isBinaryPath(filePath: string): boolean {
  const binaryExtensions = [
    ".png",
    ".jpg",
    ".jpeg",
    ".gif",
    ".ico",
    ".webp",
    ".mp4",
    ".webm",
    ".mov",
    ".mp3",
    ".wav",
    ".pdf",
    ".zip",
    ".tar",
    ".gz",
    ".7z",
    ".ttf",
    ".woff",
    ".woff2",
    ".eot",
    ".exe",
    ".dll",
    ".so",
    ".dylib",
  ];
  return binaryExtensions.some((ext) => filePath.toLowerCase().endsWith(ext));
}

/**
 * Checks if a file should be included in deployment
 */
function shouldIncludeFile(filePath: string): boolean {
  const excludePatterns = [
    /^\.git\//,
    /^\.env/,
    /^node_modules\//,
    /^\.next\//,
    /^dist\//,
    /^\.vercel\//,
    /^\.vscode\//,
    /^\.idea\//,
    /\.(log|lock)$/,
    /^npm-debug\.log/,
    /^yarn-debug\.log/,
    /^yarn-error\.log/,
  ];
  return !excludePatterns.some((pattern) => pattern.test(filePath));
}

/**
 * Prepares files for deployment
 */
export async function getFiles(directory: string): Promise<InlinedFile[]> {
  const files: InlinedFile[] = [];
  const entries = await fs.readdir(directory, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(directory, entry.name);
    const relativePath = path.relative(directory, fullPath);
    if (!shouldIncludeFile(relativePath)) continue;
    if (entry.isDirectory()) {
      files.push(...(await getFiles(fullPath)));
    } else {
      if (isBinaryPath(relativePath)) {
        const data = await fs.readFile(fullPath, "base64");
        files.push({
          file: relativePath,
          data,
          encoding: "base64",
        });
      } else {
        const data = await fs.readFile(fullPath, "utf-8");
        files.push({
          file: relativePath,
          data,
          encoding: "utf-8",
        });
      }
    }
  }
  return files;
}

/**
 * Splits files into chunks to avoid request size limits
 */
export function splitFilesIntoChunks(
  files: InlinedFile[],
  maxChunkSize = 8 * 1024 * 1024,
): InlinedFile[][] {
  const chunks: InlinedFile[][] = [];
  let currentChunk: InlinedFile[] = [];
  let currentSize = 0;
  for (const file of files) {
    const fileSize = Buffer.byteLength(
      file.data,
      file.encoding === "base64" ? "base64" : "utf8",
    );
    if (currentSize + fileSize > maxChunkSize && currentChunk.length > 0) {
      chunks.push(currentChunk);
      currentChunk = [];
      currentSize = 0;
    }
    currentChunk.push(file);
    currentSize += fileSize;
  }
  if (currentChunk.length > 0) chunks.push(currentChunk);
  return chunks.length > 0 ? chunks : [[]];
}

/**
 * Monitors deployment logs and status.
 *
 * Accepts `teamId` and `slug` for the proper team context.
 */
export async function monitorDeployment(
  vercel: VercelCore,
  deploymentId: string,
  teamId: string,
  slug: string,
  showDetailedLogs = false,
): Promise<void> {
  try {
    const logsRes = await deploymentsGetDeploymentEvents(vercel, {
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
 * Creates a new deployment.
 *
 * Retrieves the primary team info (teamId and slug) and then:
 * 1. Creates/links the project using projectsCreateProject.
 * 2. Creates the deployment using deploymentsCreateDeployment.
 */
export async function createDeployment(
  memory: ReliverseMemory,
  vercel: VercelCore,
  projectName: string,
  config: VercelDeploymentConfig,
  selectedOptions: { includes: (option: string) => boolean },
  githubUsername: string,
): Promise<{ url: string; id: string }> {
  relinka("info", "Creating deployment from GitHub...");

  // Retrieve primary team details.
  const vercelTeam = await getPrimaryVercelTeam(vercel, memory);
  if (!vercelTeam) throw new Error("No Vercel team found.");
  const teamId = vercelTeam.id;
  const slug = vercelTeam.slug;

  // Create (or link) the project.
  const projectRes = await withRateLimit(async () => {
    return await projectsCreateProject(vercel, {
      teamId,
      slug,
      requestBody: {
        name: projectName,
        framework: config.framework ?? "nextjs",
        buildCommand: config.buildCommand,
        outputDirectory: config.outputDirectory,
        rootDirectory: config.rootDirectory,
        devCommand: config.devCommand,
        installCommand: config.installCommand,
        gitRepository: {
          type: "github",
          repo: `${githubUsername}/${projectName}`,
        },
      },
    });
  });
  if (!projectRes.ok) throw projectRes.error;
  const project = projectRes.value;

  // Create the deployment.
  const deploymentRes = await withRateLimit(async () => {
    return await deploymentsCreateDeployment(vercel, {
      teamId,
      slug,
      requestBody: {
        name: projectName,
        target: "production",
        project: project.id,
        gitSource: {
          type: "github",
          ref: "main",
          repoId: `${githubUsername}/${projectName}`,
        },
      },
    });
  });
  if (!deploymentRes.ok) throw deploymentRes.error;
  const deployment = deploymentRes.value;
  if (!deployment?.id || !deployment.readyState || !deployment.url) {
    throw new Error(
      "Failed to create deployment – invalid response from Vercel",
    );
  }

  // Monitor deployment progress.
  let status = deployment.readyState;
  const inProgressStates = ["BUILDING", "INITIALIZING", "QUEUED"] as const;
  const deploymentUrl = slug
    ? `https://vercel.com/${slug}/${projectName}`
    : "https://vercel.com";
  relinka(
    "info",
    `Deployment started. Visit ${deploymentUrl} to monitor progress.`,
    "Please wait. Status messages will be shown every 20 seconds.",
  );
  let lastMessageTime = Date.now();
  while (inProgressStates.includes(status as string)) {
    await monitorDeployment(
      vercel,
      deployment.id,
      teamId,
      slug,
      selectedOptions.includes("monitoring"),
    );
    await new Promise((resolve) => setTimeout(resolve, 5000));
    const depRes = await withRateLimit(async () => {
      return await deploymentsGetDeployment(vercel, {
        idOrUrl: deployment.id,
        teamId,
        slug,
      });
    });
    if (!depRes.ok) throw depRes.error;
    status = depRes.value.readyState;
    const now = Date.now();
    if (now - lastMessageTime >= 20000) {
      await relinkaAsync(
        "info",
        `Deployment status: ${status}`,
        undefined,
        undefined,
        { delay: 50 },
      );
      lastMessageTime = now;
    }
  }
  if (status !== "READY") {
    await monitorDeployment(
      vercel,
      deployment.id,
      teamId,
      slug,
      selectedOptions.includes("monitoring"),
    );
    throw new Error(`Deployment failed with status: ${status}`);
  }
  await monitorDeployment(
    vercel,
    deployment.id,
    teamId,
    slug,
    selectedOptions.includes("monitoring"),
  );
  return {
    url: deployment.url,
    id: deployment.id,
  };
}

/**
 * Handles additional deployment steps such as environment variable configuration.
 */
export async function handleDeployment(
  vercel: VercelCore,
  projectName: string,
  projectPath: string,
  isDeployed: boolean,
  selectedOptions: DeploymentOptions,
  getEnvVars: (dir: string) => Promise<{ key: string; value: string }[]>,
): Promise<void> {
  if (isDeployed || selectedOptions.options.includes("env")) {
    relinka("info", "Setting up environment variables...");
    const rawEnvVars = await getEnvVars(projectPath);
    const envVars = rawEnvVars.map((env) => ({
      ...env,
      type: "encrypted" as const,
    }));
    if (envVars.length > 0) {
      await handleEnvironmentVariables(
        vercel,
        projectName,
        envVars,
        selectedOptions,
      );
    }
  }
}
