import { inputPrompt, task, confirmPrompt } from "@reliverse/prompts";
import fs from "fs-extra";
import { Octokit } from "octokit";
import path from "pathe";
import { simpleGit } from "simple-git";

import type { Behavior, ReliverseMemory } from "~/types.js";

import {
  readReliverseMemory,
  updateReliverseMemory,
} from "~/args/memory/impl.js";
import { relinka } from "~/utils/console.js";

import { handleGitHubOperations } from "./createWebProjectUtils.js";

export async function deployWebProject(
  deployBehavior: Behavior,
  memory: ReliverseMemory,
  repoName: string,
  repoOwner: string,
  targetDir: string,
  domain: string,
  vercelTeamName: string,
) {
  relinka("info", "To make deploy, let's create a GitHub repository first...");

  let octokit: Octokit | null = null;

  // Initialize Octokit with token if available
  if (memory.githubKey) {
    octokit = new Octokit({
      auth: memory.githubKey,
    });
  } else {
    // Get token from user if not available
    const token = await inputPrompt({
      title: "Please enter your GitHub personal access token:",
      content:
        "Create one at https://github.com/settings/tokens/new \nSet checkmark to `repo` scope and click `Generate token`",
      validate: (value: string): string | void => {
        if (!value?.trim()) {
          return "Token is required";
        }
      },
    });

    octokit = new Octokit({
      auth: token,
    });

    // Save token to memory
    await updateReliverseMemory({
      githubKey: token,
    });
  }

  await handleGitHubOperations(octokit, repoOwner, repoName, targetDir);

  let shouldDeploy: boolean;

  if (deployBehavior === "autoYes") {
    // autoYes: no prompt, always push and deploy
    shouldDeploy = true;
  } else if (deployBehavior === "autoNo") {
    // autoNo: no prompt, never push and deploy
    shouldDeploy = false;
  } else {
    // prompt: ask the user
    shouldDeploy = await confirmPrompt({
      title:
        "Are you ready to push the commit? After this, the deployment will start.",
      content: "Select 'No' to continue without pushing and deploying",
      defaultValue: true,
    });
  }

  if (shouldDeploy) {
    try {
      relinka("info", "Pushing to remote repository...");
      const git = simpleGit({ baseDir: targetDir });

      // Set up the upstream tracking and push
      await git.push("origin", "main", ["--set-upstream"]);

      relinka("success", "Successfully pushed to remote repository!");
    } catch (pushError) {
      relinka(
        "error",
        "Failed to push to repository:",
        pushError instanceof Error ? pushError.message : String(pushError),
      );
      return;
    }
  } else {
    relinka("info", "Continuing without pushing and deploying...");
  }

  if (shouldDeploy) {
    relinka("info", "Checking for Vercel authentication...");

    // First try to get token from memory
    const memory = await readReliverseMemory();
    let vercelToken = memory.vercelKey;

    // Check for both null and undefined cases explicitly
    if (vercelToken === null || vercelToken === undefined || vercelToken === "") {
      relinka("info", "Opening Vercel tokens page in your browser...");

      vercelToken = await inputPrompt({
        title: "Please create and paste your Vercel token:",
        content: "Visit 👉 https://vercel.com/account/tokens",
        hint: "🔐 It will be saved securely on your machine.",
        contentColor: "yellowBright",
        validate: (value: string): string | void => {
          if (!value?.trim()) {
            return "Token is required";
          }
        },
      });

      // Save token to memory
      await updateReliverseMemory({
        vercelKey: vercelToken,
      });

      // Verify token was saved
      const updatedMemory = await readReliverseMemory();
      if (!updatedMemory.vercelKey) {
        relinka("error", "Failed to save Vercel token to memory.");
        return;
      }

      relinka("success", "Vercel token saved successfully!");
    }

    try {
      const { Vercel } = await import("@vercel/sdk");
      const vercel = new Vercel({
        bearerToken: vercelToken,
      });

      // Create project first
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
          teamId: vercelTeamName || undefined,
        });
        relinka("success", "Project created on Vercel successfully!");
      } catch (projectError: any) {
        if (projectError?.response?.status === 409) {
          relinka("info", "Project already exists on Vercel, continuing...");
        } else {
          throw projectError;
        }
      }

      // Now set up environment variables
      try {
        const envVars = [];

        // Always add NEXT_PUBLIC_APP_URL
        envVars.push({
          key: "NEXT_PUBLIC_APP_URL",
          value: domain
            ? `https://${domain}`
            : `https://${repoName}.vercel.app`,
          target: ["production", "preview", "development"],
          type: "plain",
        });

        // Check if .env file exists and read variables from it
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
                  type: "encrypted", // Use encrypted type for .env variables
                });
              }
            }
          }
        }

        if (envVars.length > 0) {
          // Adds environment variables to the project
          await vercel.projects.createProjectEnv({
            idOrName: repoName,
            upsert: "true",
            requestBody: envVars,
          });

          relinka("success", "Environment variables set up successfully!");
        }
      } catch (envError) {
        relinka(
          "error",
          "Error setting up environment variables:",
          envError instanceof Error ? envError.message : String(envError),
        );
      }

      // Finally, create the deployment
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
        `Deployment created: ID ${createResponse.id} and status ${createResponse.status}`,
      );

      relinka(
        "info",
        `You can visit 👉 https://vercel.com 👉 ${repoName} 👉 Deployments, to see the deployment process.`,
      );

      // Check deployment status
      let deploymentStatus;
      let deploymentURL;

      await task({
        spinnerSolution: "ora",
        initialMessage: "Checking deployment status...",
        successMessage: "✅ Deployment status check complete",
        errorMessage: "❌ Failed to check deployment status",
        async action(updateMessage) {
          do {
            await new Promise((resolve) => setTimeout(resolve, 5000)); // Wait 5 seconds between checks

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

        // Set up domain if provided and it's not a .vercel.app domain
        if (domain && !domain.endsWith(".vercel.app")) {
          try {
            const addDomainResponse = await vercel.projects.addProjectDomain({
              idOrName: repoName,
              requestBody: {
                name: domain,
              },
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
    } catch (error) {
      if (error instanceof Error && error.message?.includes("403")) {
        relinka(
          "error",
          "Authentication failed. Your token might be invalid or expired.",
          "Please create a new token at https://vercel.com/account/tokens",
        );
        // Remove invalid token from memory
        await updateReliverseMemory({
          githubKey: null,
          vercelKey: null,
        });
      } else {
        relinka(
          "error",
          "Error during deployment:",
          error instanceof Error ? error.message : String(error),
        );
      }
    }
  }
}
