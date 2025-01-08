import type {
  GetProjectsFramework,
  GetProjectsTarget1,
} from "@vercel/sdk/models/getprojectsop";

import { Octokit } from "@octokit/rest";
import { spinnerTaskPrompt } from "@reliverse/prompts";
import { Vercel } from "@vercel/sdk";
import fs from "fs-extra";
import path from "pathe";

import { relinka } from "~/app/menu/create-project/cp-modules/cli-main-modules/handlers/logger.js";
import { askGithubName } from "~/app/menu/create-project/cp-modules/cli-main-modules/modules/askGithubName.js";
import {
  readReliverseMemory,
  updateReliverseMemory,
} from "~/args/memory/impl.js";

import { withRateLimit } from "./vercel-api.js";
import {
  enableAnalytics,
  configureBranchProtection,
  configureResources,
  getConfigurationOptions,
} from "./vercel-config.js";
import { createDeployment } from "./vercel-deploy.js";

export type InlinedFile = {
  file: string;
  data: string;
  encoding: "utf-8" | "base64";
};

type VercelFramework = GetProjectsFramework;

/**
 * Saves token to memory and persists it
 */
async function saveToken(token: string): Promise<void> {
  const memory = await readReliverseMemory();
  memory.vercelKey = token;
  await updateReliverseMemory(memory);
  relinka("success", "Vercel token saved successfully!");
}

/**
 * Gets environment variables from .env file
 */
async function getEnvVars(targetDir: string): Promise<
  {
    key: string;
    value: string;
    target: GetProjectsTarget1[];
    type: "plain" | "encrypted" | "sensitive";
  }[]
> {
  const envFile = path.join(targetDir, ".env");
  const envVars: {
    key: string;
    value: string;
    target: GetProjectsTarget1[];
    type: "plain" | "encrypted" | "sensitive";
  }[] = [];

  if (await fs.pathExists(envFile)) {
    const content = await fs.readFile(envFile, "utf-8");
    const lines = content.split("\n");

    for (const line of lines) {
      const [key, ...valueParts] = line.trim().split("=");
      if (key && !key.startsWith("#")) {
        const value = valueParts
          .join("=")
          .trim()
          .replace(/^["']|["']$/g, "");
        if (!value || value === '""' || value === "''") {
          continue; // Skip empty values
        }

        // Determine targets based on key prefix and naming
        const targets: GetProjectsTarget1[] = key.startsWith("NEXT_PUBLIC_")
          ? ["production", "preview", "development"]
          : key.includes("_PREVIEW_")
            ? ["preview"]
            : key.includes("_DEV_")
              ? ["development"]
              : ["production"];

        // Determine if value should be encrypted based on key naming and content
        const type =
          !key.startsWith("NEXT_PUBLIC_") &&
          (key.includes("SECRET") ||
            key.includes("KEY") ||
            key.includes("TOKEN") ||
            key.includes("PASSWORD") ||
            key.includes("CREDENTIAL") ||
            key.includes("PRIVATE") ||
            /^[A-Fa-f0-9]{32,}$/.test(value))
            ? "encrypted"
            : "plain";

        envVars.push({
          key,
          value,
          target: targets,
          type,
        });
      }
    }
  }

  return envVars;
}

/**
 * Checks if a project is already deployed to Vercel
 */
export async function isProjectDeployed(projectName: string): Promise<boolean> {
  try {
    const memory = await readReliverseMemory();
    if (!memory?.githubKey) {
      relinka("error-verbose", "GitHub token not found in Reliverse's memory");
      return false;
    }

    const githubUsername = await askGithubName();
    if (!githubUsername) {
      relinka("error", "Could not determine GitHub username");
      return false;
    }

    const octokit = new Octokit({
      auth: memory.githubKey,
    });

    try {
      // Check for Vercel deployments in GitHub
      const { data: deployments } = await octokit.rest.repos.listDeployments({
        owner: githubUsername,
        repo: projectName,
        environment: "Production",
      });

      // Look for Vercel deployments
      const vercelDeployments = deployments.filter((deployment) => {
        // Vercel deployments typically have a vercel.app URL in the payload
        const payload = deployment.payload as { url?: string } | null;
        return (
          (payload?.url?.includes("vercel.app") ?? false) ||
          (deployment.description?.includes("Vercel") ?? false) ||
          deployment.creator?.login === "vercel[bot]"
        );
      });

      return vercelDeployments.length > 0;
    } catch (error) {
      if (error instanceof Error && error.message.includes("Not Found")) {
        return false;
      }
      throw error;
    }
  } catch (error) {
    if (error instanceof Error && error.message.includes("Bad credentials")) {
      relinka("error", "Invalid GitHub token");
      return false;
    }
    relinka(
      "error",
      "Error checking deployment status:",
      error instanceof Error ? error.message : String(error),
    );
    return false;
  }
}

/**
 * Detects the project framework
 */
async function detectFramework(directory: string): Promise<VercelFramework> {
  try {
    const packageJsonPath = path.join(directory, "package.json");
    if (await fs.pathExists(packageJsonPath)) {
      const packageJson = await fs.readJson(packageJsonPath);
      const { dependencies = {}, devDependencies = {} } = packageJson;
      const allDeps = { ...dependencies, ...devDependencies };

      if (allDeps.next) return "nextjs";
      if (allDeps.nuxt) return "nuxtjs";
      if (allDeps["@sveltejs/kit"]) return "sveltekit";
      if (allDeps.astro) return "astro";
      if (allDeps.gatsby) return "gatsby";
      if (allDeps.remix) return "remix";
      if (allDeps.vue) return "vue";
      if (allDeps.react) return "create-react-app";
      if (allDeps["@angular/core"]) return "angular";
      if (allDeps.svelte) return "svelte";
      if (allDeps.vite) return "vite";
    }

    // Check for framework-specific files/directories
    const files = await fs.readdir(directory);
    if (files.includes("astro.config.mjs") || files.includes("astro.config.ts"))
      return "astro";
    if (files.includes("nuxt.config.js") || files.includes("nuxt.config.ts"))
      return "nuxtjs";
    if (files.includes("svelte.config.js")) return "sveltekit";
    if (files.includes("gatsby-config.js")) return "gatsby";
    if (files.includes("remix.config.js")) return "remix";
    if (
      files.includes("next.config.js") ||
      files.includes("next.config.mjs") ||
      files.includes("next.config.ts")
    )
      return "nextjs";
    if (files.includes("vite.config.js") || files.includes("vite.config.ts"))
      return "vite";

    return "nextjs"; // Default to Next.js if no framework is detected
  } catch (_error) {
    relinka("warn", "Failed to detect framework, defaulting to Next.js");
    return "nextjs";
  }
}

/**
 * Verifies domain configuration
 */
async function verifyDomain(
  vercel: Vercel,
  projectId: string,
  domain: string,
): Promise<boolean> {
  try {
    const domainResponse = await vercel.projects.getProjectDomain({
      idOrName: projectId,
      domain,
    });

    if (domainResponse.verification && domainResponse.verification.length > 0) {
      relinka(
        "info",
        "Domain verification required. Please add the following DNS records:",
      );
      for (const record of domainResponse.verification) {
        relinka("info", `Type: ${record.type}, Value: ${record.value}`);
      }
      return false;
    }

    return domainResponse.verified;
  } catch (error) {
    relinka(
      "error",
      "Error verifying domain:",
      error instanceof Error ? error.message : String(error),
    );
    return false;
  }
}

/**
 * Creates or updates a Vercel deployment
 */
export async function createVercelDeployment(
  projectName: string,
  targetDir: string,
  domain: string,
): Promise<boolean> {
  try {
    // 1. First ensure we have a valid token
    const memory = await readReliverseMemory();
    if (!memory?.vercelKey) {
      const { inputPrompt } = await import("@reliverse/prompts");
      const token = await inputPrompt({
        title:
          "Please enter your Vercel personal access token.\n(It will be securely stored on your machine):",
        content: "Create one at https://vercel.com/account/settings/tokens",
        validate: (value: string) => {
          if (!value?.trim()) return "Token is required";
          return true;
        },
      });

      if (!token) {
        relinka("error", "No token provided");
        return false;
      }

      await saveToken(token);
      memory.vercelKey = token;
    }

    // 2. Initialize Vercel client
    const vercel = new Vercel({ bearerToken: memory.vercelKey });

    // 3. Now check for existing deployment
    relinka("info", "Checking for existing deployment...");
    const isDeployed = await isProjectDeployed(projectName);
    if (isDeployed) {
      relinka("info", "Project is already deployed to Vercel");
    } else {
      relinka(
        "info",
        "No existing deployment found. Initializing new deployment...",
      );
    }

    // Get configuration options before starting the spinner
    const selectedOptions = !isDeployed
      ? await getConfigurationOptions()
      : { options: ["env"] };

    await spinnerTaskPrompt({
      spinnerSolution: "ora",
      initialMessage: "Setting up deployment...",
      successMessage: "✅ Deployment completed successfully!",
      errorMessage: "❌ Deployment failed",
      async action(updateMessage) {
        // 1. Project Setup Phase
        let projectId: string | undefined;
        if (!isDeployed) {
          updateMessage("Creating new project...");
          const framework = await detectFramework(targetDir);
          const projectResponse = await withRateLimit(async () => {
            return await vercel.projects.createProject({
              requestBody: {
                name: projectName,
                framework,
                gitRepository: {
                  type: "github",
                  repo: projectName,
                },
              },
            });
          });

          projectId = projectResponse.id;
          relinka("success", `Project created with ID: ${projectId}`);

          // 2. Project Configuration Phase
          if (selectedOptions.options.includes("analytics")) {
            await enableAnalytics(vercel, projectId);
          }

          if (selectedOptions.options.includes("protection")) {
            await configureBranchProtection(vercel, projectId);
          }

          if (selectedOptions.options.includes("resources")) {
            await configureResources(vercel, projectId);
          }

          // 3. Domain Configuration Phase
          if (domain && !domain.endsWith(".vercel.app")) {
            await vercel.projects.addProjectDomain({
              idOrName: projectName,
              requestBody: {
                name: domain,
              },
            });

            const isVerified = await verifyDomain(vercel, projectId, domain);
            if (!isVerified) {
              relinka(
                "warn",
                "Please complete domain verification before proceeding",
              );
            }
          }
        }

        // 4. Environment Variables Phase
        if (isDeployed || selectedOptions.options.includes("env")) {
          updateMessage("Setting up environment variables...");
          const envVars = await getEnvVars(targetDir);
          if (envVars.length > 0) {
            await withRateLimit(async () => {
              await vercel.projects.createProjectEnv({
                idOrName: projectName,
                upsert: "true",
                requestBody: envVars,
              });
            });
            console.log("");
            relinka("success", "Environment variables added successfully");
          }
        }

        // 5. Deployment Phase
        const githubUsername = await askGithubName();
        if (!githubUsername) {
          throw new Error("Could not determine GitHub username");
        }

        const deployment = await createDeployment(
          vercel,
          projectName,
          {
            framework: await detectFramework(targetDir),
          },
          updateMessage,
          {
            includes: (option: string) =>
              selectedOptions.options.includes(option),
          },
          githubUsername,
        );

        console.log("");
        relinka("success", `Deployment URL: ${deployment.url}`);
      },
    });

    return true;
  } catch (error) {
    if (error instanceof Error) {
      if (error.message.includes("rate limit")) {
        relinka(
          "error",
          "Vercel API rate limit exceeded. Please try again later.",
        );
      } else if (error.message.includes("network")) {
        relinka(
          "error",
          "Network error. Please check your internet connection.",
        );
      } else if (error.message.includes("unauthorized")) {
        relinka(
          "error",
          "Invalid or expired Vercel token. Please provide a new token.",
        );
        await updateReliverseMemory({ vercelKey: "" });
      } else {
        relinka("error", "Error creating Vercel deployment:", error.message);
      }
    } else {
      relinka("error", "An unexpected error occurred during deployment");
    }
    return false;
  }
}
