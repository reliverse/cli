import type { Vercel } from "@vercel/sdk";

import pc from "picocolors";

import { relinka } from "~/utils/console.js";

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
  const { multiselectPrompt } = await import("@reliverse/prompts");
  const result = await multiselectPrompt({
    title: "Select Vercel deployment options:",
    options: [
      { value: "env", label: "Upload environment variables" },
      {
        value: "shared_env",
        label: `${pc.redBright("[🚨 Experimental]")} Get Vercel shared env vars`,
      },
      {
        value: "analytics",
        label: `${pc.redBright("[🚨 Experimental]")} Enable analytics`,
      },
      {
        value: "protection",
        label: `${pc.redBright("[🚨 Experimental]")} Configure branch protection`,
      },
      {
        value: "resources",
        label: `${pc.redBright("[🚨 Experimental]")} Configure serverless resources`,
      },
      {
        value: "monitoring",
        label: `${pc.redBright("[🚨 Experimental]")} Show detailed deployment logs`,
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
