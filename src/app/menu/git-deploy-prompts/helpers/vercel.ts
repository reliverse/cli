import type { Vercel as VercelClient } from "@vercel/sdk";

import { inputPrompt, spinnerTaskPrompt } from "@reliverse/prompts";
import fs from "fs-extra";
import path from "pathe";

import {
  readReliverseMemory,
  updateReliverseMemory,
} from "~/args/memory/impl.js";
import { relinka } from "~/utils/console.js";

async function ensureVercelToken(): Promise<string> {
  const memory = await readReliverseMemory();
  if (memory.vercelKey) {
    return memory.vercelKey;
  }

  const vercelToken = await inputPrompt({
    title: "Please create and paste your Vercel token:",
    content: "Visit 👉 https://vercel.com/account/tokens",
    hint: "🔐 It will be saved securely on your machine.",
    contentColor: "yellowBright",
    validate: (value: string) => {
      if (!value?.trim()) {
        return "Token is required";
      }
      return true;
    },
  });

  await updateReliverseMemory({ vercelKey: vercelToken });
  const updatedMemory = await readReliverseMemory();

  if (!updatedMemory.vercelKey) {
    relinka("error", "Failed to save Vercel token to memory.");
    throw new Error("Failed to save Vercel token");
  }

  relinka("success", "Vercel token saved successfully!");
  return vercelToken;
}

async function createVercelProject(
  vercel: VercelClient,
  repoOwner: string,
  repoName: string,
  vercelTeamName: string,
) {
  try {
    await vercel.projects.createProject({
      requestBody: {
        name: repoName,
        framework: "nextjs",
        gitRepository: {
          type: "github",
          repo: `${repoOwner}/${repoName}`,
        },
      },
      teamId: vercelTeamName ?? undefined,
    });
    relinka("success", "Project created on Vercel successfully!");
  } catch (projectError: any) {
    if (projectError?.response?.status === 409) {
      relinka("info", "Project already exists on Vercel, continuing...");
    } else {
      throw projectError;
    }
  }
}

async function setVercelEnvVariables(
  vercel: VercelClient,
  repoName: string,
  domain: string,
  targetDir: string,
) {
  const envVars: {
    key: string;
    value: string;
    target: string[];
    type: "plain" | "encrypted";
  }[] = [];

  // Always add NEXT_PUBLIC_APP_URL
  envVars.push({
    key: "NEXT_PUBLIC_APP_URL",
    value: domain ? `https://${domain}` : `https://${repoName}.vercel.app`,
    target: ["production", "preview", "development"],
    type: "plain",
  });

  // Check for .env file
  const envFilePath = path.join(targetDir, ".env");
  if (await fs.pathExists(envFilePath)) {
    const envContent = await fs.readFile(envFilePath, "utf-8");
    const envLines = envContent.split("\n");

    for (const line of envLines) {
      const trimmedLine = line.trim();
      if (trimmedLine && !trimmedLine.startsWith("#")) {
        const [key, ...valueParts] = trimmedLine.split("=");
        const value = valueParts.join("=").trim();
        if (key && value) {
          envVars.push({
            key: key.trim(),
            value: value.replace(/["']/g, ""), // Remove quotes if present
            target: ["production", "preview", "development"],
            type: "encrypted",
          });
        }
      }
    }
  }

  if (envVars.length > 0) {
    await vercel.projects.createProjectEnv({
      idOrName: repoName,
      upsert: "true",
      requestBody: envVars as any,
    });
    relinka("success", "Environment variables set up successfully!");
  }
}

async function createAndCheckVercelDeployment(
  vercel: VercelClient,
  repoOwner: string,
  repoName: string,
  domain: string,
) {
  const createResponse = await vercel.deployments.createDeployment({
    requestBody: {
      name: repoName,
      target: "production",
      gitSource: {
        type: "github",
        repo: repoName,
        ref: "main",
        org: repoOwner,
      },
      projectSettings: {
        framework: "nextjs",
        buildCommand: "next build",
        outputDirectory: ".next",
        installCommand: "bun install",
        devCommand: "next dev",
        rootDirectory: null,
      },
    },
  });

  relinka(
    "info",
    `Deployment created: ID ${createResponse.id}, Status: ${createResponse.status}`,
  );
  relinka(
    "info",
    `Check https://vercel.com -> ${repoName} -> Deployments to see the process.`,
  );

  let deploymentStatus: string | undefined;
  let deploymentURL: string | undefined;

  await spinnerTaskPrompt({
    spinnerSolution: "ora",
    initialMessage: "Checking deployment status...",
    successMessage: "✅ Deployment status check complete",
    errorMessage: "❌ Failed to check deployment status",
    async action(updateMessage) {
      do {
        await new Promise((resolve) => setTimeout(resolve, 5000));
        const statusResponse = await vercel.deployments.getDeployment({
          idOrUrl: createResponse.id,
          withGitRepoInfo: "true",
        });

        deploymentStatus = statusResponse.status;
        deploymentURL = statusResponse.url;
        updateMessage(`Deployment status: ${deploymentStatus}`);
      } while (
        deploymentStatus === "BUILDING" ||
        deploymentStatus === "INITIALIZING"
      );
    },
  });

  if (deploymentStatus === "READY") {
    relinka("success", `Deployment successful. URL: ${deploymentURL}`);

    // If domain provided and not a .vercel.app domain
    if (domain && !domain.endsWith(".vercel.app")) {
      try {
        const addDomainResponse = await vercel.projects.addProjectDomain({
          idOrName: repoName,
          requestBody: { name: domain },
        });
        relinka("success", `Domain added: ${addDomainResponse.name}`);
      } catch (error) {
        relinka(
          "error",
          "Error setting up domain:",
          error instanceof Error ? error.message : String(error),
        );
      }
    }
  } else {
    relinka("error", "Deployment failed or was canceled");
  }
}

export async function createVercelDeployment(
  targetDir: string,
  repoName: string,
  repoOwner: string,
  vercelTeamName: string,
  domain: string,
) {
  try {
    relinka("info", "Checking for Vercel authentication...");
    const vercelToken = await ensureVercelToken();
    const { Vercel } = await import("@vercel/sdk");
    const vercel = new Vercel({ bearerToken: vercelToken });

    await createVercelProject(vercel, repoOwner, repoName, vercelTeamName);
    await setVercelEnvVariables(vercel, repoName, domain, targetDir);
    await createAndCheckVercelDeployment(vercel, repoOwner, repoName, domain);
  } catch (error: any) {
    if (error instanceof Error && error.message?.includes("403")) {
      relinka(
        "error",
        "Authentication failed. Your token might be invalid or expired.",
        "Please create a new token at https://vercel.com/account/tokens",
      );
      await updateReliverseMemory({ githubKey: "", vercelKey: "" });
    } else {
      relinka(
        "error",
        "Error during deployment:",
        error instanceof Error ? error.message : String(error),
      );
    }
  }
}
