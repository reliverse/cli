import { confirmPrompt, inputPrompt } from "@reliverse/prompts";
import { relinka } from "@reliverse/prompts";

import type { ReliverseMemory } from "~/utils/schemaMemory.js";

import { askGithubName } from "~/app/menu/create-project/cp-modules/cli-main-modules/modules/askGithubName.js";
import { isSpecialDomain } from "~/app/menu/create-project/cp-modules/git-deploy-prompts/helpers/domainHelpers.js";
import { updateReliverseMemory } from "~/utils/reliverseMemory.js";

import { withRateLimit } from "./vercel-api.js";
import {
  configureBranchProtection,
  configureResources,
  enableAnalytics,
  getConfigurationOptions,
} from "./vercel-config.js";
import { createDeployment } from "./vercel-deploy.js";
import { createVercelInstance } from "./vercel-instance.js";
import { createVercelCoreInstance } from "./vercel-instance.js";
import { isProjectDeployed } from "./vercel-mod.js";
import {
  detectFramework,
  getEnvVars,
  saveVercelToken,
  verifyDomain,
} from "./vercel-utils.js";

/**
 * Creates or updates a Vercel deployment
 */
export async function createVercelDeployment(
  skipPrompts: boolean,
  projectName: string,
  projectPath: string,
  domain: string,
  memory: ReliverseMemory,
  deployMode: "new" | "update",
  shouldMaskSecretInput: boolean,
  existingGithubUsername?: string,
): Promise<boolean> {
  try {
    // 1. First ensure we have a valid token
    if (!memory?.vercelKey) {
      const token = await inputPrompt({
        title:
          "Please enter your Vercel personal access token.\n(It will be securely stored on your machine):",
        content: "Create one at https://vercel.com/account/settings/tokens",
        mode: shouldMaskSecretInput ? "password" : "plain",
        validate: (value: string) => {
          if (!value?.trim()) return "Token is required";
          return true;
        },
      });

      if (!token) {
        relinka("error", "No token provided");
        return false;
      }

      const vercel = createVercelCoreInstance(token);
      await saveVercelToken(token, memory, vercel);
      memory.vercelKey = token;
    }

    // 2. Initialize Vercel client
    const vercel = createVercelInstance(memory.vercelKey);

    // 3. Now check for existing deployment
    relinka("info", "Checking for existing deployment...");
    const { isDeployed } = await isProjectDeployed(projectName, memory);
    if (isDeployed) {
      relinka("info", `Project ${projectName} is already deployed to Vercel`);
    } else {
      relinka(
        "info",
        "No existing deployment found. Initializing new deployment...",
      );
    }

    // Get configuration options before proceeding
    const selectedOptions =
      deployMode === "new" || skipPrompts
        ? { options: ["env"] }
        : await getConfigurationOptions();

    relinka("info", "Setting up deployment...");

    // 1. Project Setup Phase
    let projectId: string | undefined;
    if (!isDeployed) {
      relinka("info", "Creating new project...");
      const framework = await detectFramework(projectPath);
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

      // Only configure custom domains if it's not a default Vercel
      // domain or it's not included in the special domains list
      if (!isSpecialDomain(domain) && domain !== `${projectName}.vercel.app`) {
        let shouldAddDomain = false;
        if (skipPrompts) {
          shouldAddDomain = false;
        } else {
          shouldAddDomain = await confirmPrompt({
            title: `Do you want to add ${domain} to your Vercel project?`,
            content: `If no, ${projectName}.vercel.app domain will be created for you. You can add a custom domain later in the Vercel dashboard.`,
          });
        }
        if (!shouldAddDomain) {
          relinka("info", "Skipping custom domain configuration");
          return true;
        }

        relinka("info", "Setting up custom domain...");
        try {
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
              "Please complete domain verification in your Vercel dashboard before proceeding",
            );
          }
        } catch (error) {
          relinka(
            "warn",
            "Failed to set up custom domain. You can add it later in the Vercel dashboard:",
            error instanceof Error ? error.message : String(error),
          );
        }
      }
    }

    // 4. Environment Variables Phase
    if (isDeployed || selectedOptions.options.includes("env")) {
      relinka("info", "Setting up environment variables...");
      const envVars = await getEnvVars(projectPath);
      if (envVars.length > 0) {
        await withRateLimit(async () => {
          await vercel.projects.createProjectEnv({
            idOrName: projectName,
            upsert: "true",
            requestBody: envVars,
          });
        });
        relinka("success", "Environment variables added successfully");
      }
    }

    // 5. Deployment Phase
    const githubUsername =
      existingGithubUsername ?? (await askGithubName(memory));
    if (!githubUsername) {
      throw new Error("Could not determine GitHub username");
    }

    const deployment = await createDeployment(
      memory,
      vercel,
      projectName,
      {
        framework: await detectFramework(projectPath),
      },
      {
        includes: (option: string) => selectedOptions.options.includes(option),
      },
      githubUsername,
    );

    relinka("success", `Deployment URL: https://${deployment.url}`);
    relinka("success", "✅ Deployment completed successfully!");

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
