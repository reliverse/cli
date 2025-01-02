import type { Vercel } from "@vercel/sdk";

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

/**
 * Gets configuration options from user
 */
export async function getConfigurationOptions(): Promise<string[]> {
  const { multiselectPrompt } = await import("@reliverse/prompts");
  const result = await multiselectPrompt({
    title: "Select additional configuration options:",
    options: [
      { value: "env", label: "Upload environment variables" },
      { value: "analytics", label: "Enable analytics" },
      { value: "protection", label: "Configure branch protection" },
      { value: "resources", label: "Configure serverless resources" },
      { value: "monitoring", label: "Show detailed deployment logs" },
    ],
    defaultValue: ["env"],
  });

  return Array.isArray(result) ? result : ["env"];
}
