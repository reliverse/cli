import { relinka } from "@reliverse/prompts";
import { ofetch } from "ofetch";

import type { ReliverseConfig } from "~/libs/config/config-main.js";

import { UNKNOWN_VALUE } from "~/libs/sdk/constants.js";
import { REPO_TEMPLATES } from "~/utils/projectRepository.js";
import { updateReliverseConfig } from "~/utils/reliverseConfig.js";

/**
 * Response type for UNGH API repository information
 */
type UnghRepoResponse = {
  repo?: {
    pushedAt: string;
  };
};

/**
 * Type for template update check results
 */
export type TemplateUpdateInfo = {
  hasUpdate: boolean;
  currentDate: string;
  latestDate: string | null;
};

/**
 * Checks if a project template has an update available
 * @param projectConfig The project's reliverse config
 * @returns Object containing update info
 */
export async function checkForTemplateUpdate(
  projectConfig: ReliverseConfig,
): Promise<TemplateUpdateInfo> {
  // If no template is specified or it has an unknown value, no updates to check
  if (
    !projectConfig.projectTemplate ||
    projectConfig.projectTemplate === UNKNOWN_VALUE
  ) {
    return { hasUpdate: false, currentDate: "", latestDate: null };
  }

  // If no template date is recorded, no way to check for updates
  if (
    !projectConfig.projectTemplateDate ||
    projectConfig.projectTemplateDate === UNKNOWN_VALUE
  ) {
    return { hasUpdate: false, currentDate: "", latestDate: null };
  }

  // Find the template in our repository list
  const templateRepo = REPO_TEMPLATES.find(
    (repo) => repo.id === projectConfig.projectTemplate,
  );
  if (!templateRepo) {
    return {
      hasUpdate: false,
      currentDate: projectConfig.projectTemplateDate,
      latestDate: null,
    };
  }

  // Extract owner and repository name for the UNGH API call
  const [owner, repoName] = templateRepo.id.split("/");
  if (!owner || !repoName) {
    return {
      hasUpdate: false,
      currentDate: projectConfig.projectTemplateDate,
      latestDate: null,
    };
  }

  // Call UNGH API to get latest commit date
  const url = `https://ungh.cc/repos/${owner}/${repoName}`;
  try {
    // ofetch automatically parses JSON using destr
    const data = await ofetch<UnghRepoResponse>(url);
    const latestDate = data.repo?.pushedAt ?? null;

    if (!latestDate) {
      return {
        hasUpdate: false,
        currentDate: projectConfig.projectTemplateDate,
        latestDate: null,
      };
    }

    // Compare dates to see if an update is available
    const currentDate = new Date(projectConfig.projectTemplateDate);
    const remoteDate = new Date(latestDate);

    // Check if the remote template is newer than the current one
    const hasUpdate = remoteDate > currentDate;

    return {
      hasUpdate,
      currentDate: projectConfig.projectTemplateDate,
      latestDate,
    };
  } catch (error) {
    relinka(
      "warn",
      `Failed to check template updates: ${error instanceof Error ? error.message : String(error)}`,
    );
    return {
      hasUpdate: false,
      currentDate: projectConfig.projectTemplateDate,
      latestDate: null,
    };
  }
}

/**
 * Updates the project template date in the config to the latest date
 * @param projectPath The path to the project directory
 * @param latestDate The latest template date to update to
 * @param isDev Whether running in development mode
 */
export async function updateProjectTemplateDate(
  projectPath: string,
  latestDate: string,
  isDev: boolean,
): Promise<void> {
  try {
    // Update the projectTemplateDate field in the config
    await updateReliverseConfig(
      projectPath,
      { projectTemplateDate: latestDate },
      isDev,
    );
    relinka("success", `Updated project template date to ${latestDate}`);
  } catch (error) {
    relinka(
      "error",
      `Failed to update template date: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}
