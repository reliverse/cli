import type { Vercel } from "@vercel/sdk";

import { relinka } from "@reliverse/prompts";
import { type InlinedFile } from "@vercel/sdk/models/createdeploymentop";
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

    if (!shouldIncludeFile(relativePath)) {
      continue;
    }

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

  if (currentChunk.length > 0) {
    chunks.push(currentChunk);
  }

  return chunks.length > 0 ? chunks : [[]];
}

/**
 * Monitors deployment logs and status
 */
export async function monitorDeployment(
  vercel: Vercel,
  deploymentId: string,
  showDetailedLogs = false,
): Promise<void> {
  try {
    // Get deployment logs
    const logs = await vercel.deployments.getDeploymentEvents({
      idOrUrl: deploymentId,
    });

    if (Array.isArray(logs)) {
      let errors = 0;
      let warnings = 0;

      for (const log of logs as DeploymentLog[]) {
        const timestamp = new Date(log.created).toLocaleTimeString();
        const message = `[${log.type}] ${log.text}`;

        switch (log.type) {
          case "error":
            errors++;
            relinka("error", `${timestamp}: ${message}`);
            break;
          case "warning":
            warnings++;
            relinka("warn", `${timestamp}: ${message}`);
            break;
          default:
            if (showDetailedLogs) {
              relinka("info", `${timestamp}: ${message}`);
            }
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

export async function createDeployment(
  memory: ReliverseMemory,
  vercel: Vercel,
  projectName: string,
  config: VercelDeploymentConfig,
  selectedOptions: { includes: (option: string) => boolean },
  githubUsername: string,
): Promise<{ url: string; id: string }> {
  relinka("info", "Creating deployment from GitHub...");
  const deployment = await withRateLimit(async () => {
    return await vercel.deployments.createDeployment({
      requestBody: {
        name: projectName,
        target: "production",
        gitSource: {
          type: "github",
          repo: projectName,
          ref: "main",
          org: githubUsername,
        },
        projectSettings: {
          framework: config.framework ?? "nextjs",
          buildCommand: config.buildCommand ?? null,
          outputDirectory: config.outputDirectory ?? null,
          rootDirectory: config.rootDirectory ?? null,
          devCommand: config.devCommand ?? null,
          installCommand: config.installCommand ?? null,
        },
      },
    });
  });

  if (!deployment?.id || !deployment.readyState || !deployment.url) {
    throw new Error(
      "Failed to create deployment - invalid response from Vercel",
    );
  }

  // Monitor deployment progress
  let status = deployment.readyState;
  const inProgressStates = ["BUILDING", "INITIALIZING", "QUEUED"] as const;

  const vercelTeam = await getPrimaryVercelTeam(vercel, memory);
  const vercelSlug = vercelTeam?.slug;
  const deploymentUrl = vercelSlug
    ? `https://vercel.com/${vercelSlug}/${projectName}`
    : "https://vercel.com";

  relinka(
    "info",
    `Deployment started. Visit ${deploymentUrl} to monitor progress.`,
    "Please wait. Status messages will be shown every 20 seconds.",
  );

  let lastMessageTime = Date.now();
  while (inProgressStates.includes(status as ReadyState)) {
    // Monitor logs with detailed option
    await monitorDeployment(
      vercel,
      deployment.id,
      selectedOptions.includes("monitoring"),
    );

    // Wait before checking status again (check every 5 seconds)
    await new Promise((resolve) => setTimeout(resolve, 5000));

    // Get updated status
    const { readyState: newStatus } = await withRateLimit(async () => {
      return await vercel.deployments.getDeployment({
        idOrUrl: deployment.id,
      });
    });
    status = newStatus;

    // Only show status message every 20 seconds
    const now = Date.now();
    if (now - lastMessageTime >= 20000) {
      relinka("info", `Deployment status: ${status}`);
      lastMessageTime = now;
    }
  }

  if (status !== "READY") {
    // Get final logs before throwing error
    await monitorDeployment(
      vercel,
      deployment.id,
      selectedOptions.includes("monitoring"),
    );
    throw new Error(`Deployment failed with status: ${status}`);
  }

  // Show final deployment logs
  await monitorDeployment(
    vercel,
    deployment.id,
    selectedOptions.includes("monitoring"),
  );

  return {
    url: deployment.url,
    id: deployment.id,
  };
}

export async function handleDeployment(
  vercel: Vercel,
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
