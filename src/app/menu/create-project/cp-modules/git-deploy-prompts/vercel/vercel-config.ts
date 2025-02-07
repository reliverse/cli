import type { UpdateProjectRequestBody } from "@vercel/sdk/models/updateprojectop.js";

import { multiselectPrompt } from "@reliverse/prompts";
import { relinka } from "@reliverse/prompts";
import { projectsUpdateProject } from "@vercel/sdk/funcs/projectsUpdateProject.js";

import type { InstanceVercel } from "~/utils/instanceVercel.js";

import { experimental } from "~/app/constants.js";

import { withRateLimit } from "./vercel-api.js";

/**
 * Updates a Vercel project with the given configuration
 * @see https://github.com/vercel/sdk/blob/main/docs/sdks/projects/README.md#updateproject
 */
export async function updateProject(
  vercelInstance: InstanceVercel,
  projectId: string,
  config: UpdateProjectRequestBody,
  teamId?: string,
  teamSlug?: string,
): Promise<void> {
  try {
    const res = await withRateLimit(async () => {
      return await projectsUpdateProject(vercelInstance, {
        idOrName: projectId,
        teamId,
        slug: teamSlug,
        requestBody: config,
      });
    });

    if (!res.ok) {
      throw res.error;
    }
  } catch (error) {
    relinka(
      "warn",
      `Could not update project ${projectId}:`,
      error instanceof Error ? error.message : String(error),
    );
    throw error;
  }
}

/**
 * Enables analytics for the project
 */
export async function enableAnalytics(
  vercelInstance: InstanceVercel,
  projectId: string,
): Promise<void> {
  try {
    await updateProject(vercelInstance, projectId, {
      customerSupportCodeVisibility: true,
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
  vercelInstance: InstanceVercel,
  projectId: string,
): Promise<void> {
  try {
    await updateProject(vercelInstance, projectId, {
      gitForkProtection: true,
      enablePreviewFeedback: true,
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
  vercelInstance: InstanceVercel,
  projectId: string,
): Promise<void> {
  try {
    await updateProject(vercelInstance, projectId, {
      serverlessFunctionRegion: "iad1",
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
