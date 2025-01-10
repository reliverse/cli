import type { Vercel } from "@vercel/sdk";

import { multiselectPrompt } from "@reliverse/prompts";

import { experimental } from "~/app/db/constants.js";
import { relinka } from "~/app/menu/create-project/cp-modules/cli-main-modules/handlers/logger.js";

/**
 * Enables analytics for the project
 */
export async function enableAnalytics(
  vercel: Vercel,
  projectId: string,
): Promise<void> {
  try {
    await vercel.projects.updateProject({
      idOrName: projectId,
      requestBody: {
        customerSupportCodeVisibility: true,
      },
    });
    relinka("success", "Analytics enabled successfully");
  } catch (error) {
    relinka(
      "warn",
      "Could not enable analytics:",
      error instanceof Error ? error.message : String(error),
    );
  }
}

/**
 * Configures branch protection settings
 */
export async function configureBranchProtection(
  vercel: Vercel,
  projectId: string,
): Promise<void> {
  try {
    await vercel.projects.updateProject({
      idOrName: projectId,
      requestBody: {
        gitForkProtection: true,
        enablePreviewFeedback: true,
      },
    });
    relinka("success", "Branch protection configured successfully");
  } catch (error) {
    relinka(
      "warn",
      "Could not configure branch protection:",
      error instanceof Error ? error.message : String(error),
    );
  }
}

/**
 * Configures resource settings
 */
export async function configureResources(
  vercel: Vercel,
  projectId: string,
): Promise<void> {
  try {
    await vercel.projects.updateProject({
      idOrName: projectId,
      requestBody: {
        serverlessFunctionRegion: "iad1",
      },
    });
    relinka("success", "Resource configuration updated successfully");
  } catch (error) {
    relinka(
      "warn",
      "Could not configure resources:",
      error instanceof Error ? error.message : String(error),
    );
  }
}

export type ConfigurationOptions = {
  options: string[];
  useSharedEnvVars: boolean;
};

/**
 * Gets configuration options from user
 */
export async function getConfigurationOptions(): Promise<ConfigurationOptions> {
  const result = await multiselectPrompt({
    title: "Select Vercel deployment options:",
    options: [
      { value: "env", label: "Upload environment variables" },
      {
        value: "shared_env",
        label: `Get Vercel shared env vars ${experimental}`,
      },
      {
        value: "analytics",
        label: `Enable analytics ${experimental}`,
      },
      {
        value: "protection",
        label: `Configure branch protection ${experimental}`,
      },
      {
        value: "resources",
        label: `Configure serverless resources ${experimental}`,
      },
      {
        value: "monitoring",
        label: `Show detailed deployment logs ${experimental}`,
      },
    ],
    defaultValue: ["env"],
  });

  const selectedOptions = Array.isArray(result) ? result : ["env"];
  return {
    options: selectedOptions,
    useSharedEnvVars: selectedOptions.includes("shared_env"),
  };
}
