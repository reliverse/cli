import type { VercelCore } from "@vercel/sdk/core.js";

import { confirmPrompt, inputPrompt } from "@reliverse/prompts";
import { relinka } from "@reliverse/prompts";
import { projectsAddProjectDomain } from "@vercel/sdk/funcs/projectsAddProjectDomain.js";
import { projectsCreateProject } from "@vercel/sdk/funcs/projectsCreateProject.js";
import { projectsCreateProjectEnv } from "@vercel/sdk/funcs/projectsCreateProjectEnv.js";

import type { ReliverseMemory } from "~/utils/schemaMemory.js";

import { isSpecialDomain } from "~/app/menu/create-project/cp-modules/git-deploy-prompts/helpers/domainHelpers.js";
import { updateReliverseMemory } from "~/utils/reliverseMemory.js";

import { withRateLimit } from "./vercel-api.js";
import { createVercelInstance } from "./vercel-client.js";
import {
  configureBranchProtection,
  configureResources,
  enableAnalytics,
  getConfigurationOptions,
} from "./vercel-config.js";
import { createDeployment } from "./vercel-deploy.js";
import { isRepoHasDeployments } from "./vercel-mod.js";
import {
  detectFramework,
  getEnvVars,
  saveVercelToken,
  verifyDomain,
} from "./vercel-utils.js";

export async function ensureVercelToken(
  shouldMaskSecretInput: boolean,
  memory: ReliverseMemory,
): Promise<[string, VercelCore] | undefined> {
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
      return undefined;
    }

    const vercel = createVercelInstance(token);
    await saveVercelToken(token, memory, vercel);
    memory.vercelKey = token;
    return [token, vercel];
  }
  const vercel = createVercelInstance(memory.vercelKey);
  return [memory.vercelKey, vercel];
}

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
  githubUsername: string,
): Promise<boolean> {
  try {
    // First ensure we have a valid token
    const result = await ensureVercelToken(shouldMaskSecretInput, memory);
    if (!result) {
      throw new Error(
        "Something went wrong. Vercel token not found. Please try again or notify the Reliverse CLI developers if the problem persists.",
      );
    }
    const [token, vercel] = result;
    if (!token) {
      throw new Error("Something went wrong. Vercel token not found.");
    }

    // Check for existing deployment
    relinka("info", "Checking for existing deployment...");
    const isDeployed = await isRepoHasDeployments(
      projectName,
      githubUsername,
      memory,
    );
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
      relinka("info", "Creating new Vercel project...");
      const framework = await detectFramework(projectPath);
      const createProjectRes = await withRateLimit(async () => {
        return await projectsCreateProject(vercel, {
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
      if (!createProjectRes.ok) {
        throw createProjectRes.error;
      }
      const projectResponse = createProjectRes.value;
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
          const addDomainRes = await projectsAddProjectDomain(vercel, {
            idOrName: projectName,
            requestBody: {
              name: domain,
            },
          });
          if (!addDomainRes.ok) {
            throw addDomainRes.error;
          }
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
          const envRes = await projectsCreateProjectEnv(vercel, {
            idOrName: projectName,
            upsert: "true",
            requestBody: envVars,
          });
          if (!envRes.ok) {
            throw envRes.error;
          }
        });
        relinka("success", "Environment variables added successfully");
      }
    }

    // 5. Deployment Phase
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
