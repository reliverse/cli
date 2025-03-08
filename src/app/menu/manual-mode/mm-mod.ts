import { nextStepsPrompt, relinka, selectPrompt } from "@reliverse/prompts";
import { re } from "@reliverse/relico";
import fs from "fs-extra";
import path from "pathe";

import type { ParamsOmitReli } from "~/app/app-types.js";

import { askAppOrLib } from "~/app/prompts/askAppOrLib.js";
import { askInstallDeps } from "~/app/prompts/askInstallDeps.js";
import { askOpenInIDE } from "~/app/prompts/askOpenInIDE.js";
import { askProjectName } from "~/app/prompts/askProjectName.js";
import { hasOnlyReliverseConfig } from "~/libs/sdk/funcs/hasOnlyReliverseConfig.js";
import { createPackageJSON } from "~/utils/createPackageJSON.js";
import { createTSConfig } from "~/utils/createTSConfig.js";
import { isDirectoryEmpty } from "~/utils/filesysHelpers.js";
import {
  getProjectContent,
  getReliverseConfig,
  getReliverseConfigPath,
  readReliverseConfig,
  detectProjectsWithReliverse,
  type DetectedProject,
} from "~/utils/reliverseConfig.js";

import {
  checkForTemplateUpdate,
  updateProjectTemplateDate,
  type TemplateUpdateInfo,
} from "./template/updateProjectTemplate.js";

/**
 * Shows the manual builder menu based on project content
 */
export async function showManualBuilderMenu(params: ParamsOmitReli) {
  // @ts-expect-error TODO: temporarily unused params
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { cwd, isDev, memory, config, multireli, skipPrompts } = params;

  try {
    // Check if the directory is completely empty or contains only Reliverse config
    if (await isDirectoryEmpty(cwd)) {
      relinka(
        "info",
        `Directory '${path.basename(cwd)}' is empty. Setting up a new Reliverse project.`,
      );

      // Ask for project name
      const projectName = await askProjectName({});

      // Create project directory
      const projectPath = path.resolve(cwd, projectName);
      await fs.ensureDir(projectPath);

      // Initialize package.json and tsconfig.json
      const isLib = await askAppOrLib();
      await createPackageJSON(projectPath, projectName, isLib);
      await createTSConfig(projectPath, isLib);

      // Trigger reliverse config generation
      await getReliverseConfig(projectPath, isDev);

      // Inform user and exit
      await nextStepsPrompt({
        title: `Created new project "${projectName}" with minimal Reliverse configuration.`,
        content: [
          "To continue setting up your project:",
          `1. cd ${projectName}`,
          "2. Edit the generated config files as needed",
          "3. Use '🔬 Open manual builder mode' again to continue setup",
        ],
      });

      try {
        await askOpenInIDE({ projectPath });
      } catch (error) {
        relinka(
          "warn",
          `Could not open project in IDE: ${error instanceof Error ? error.message : String(error)}`,
        );
      }

      process.exit(0);
    }

    // Detect if there are projects with Reliverse config in subdirectories
    const detectedProjects = await detectProjectsWithReliverse(cwd, isDev);
    const hasRootConfigOnly = await hasOnlyReliverseConfig(cwd);

    // Debug logging to help diagnose issues
    relinka(
      "info-verbose",
      `Detected projects: ${detectedProjects.length}, Has root config only: ${hasRootConfigOnly}`,
    );

    if (detectedProjects.length > 0) {
      relinka(
        "info-verbose",
        `Detected projects: ${detectedProjects.map((p) => p.name).join(", ")}`,
      );
    }

    // Root has reliverse config and at least one project is detected
    const hasReliConfig =
      (await fs.pathExists(path.join(cwd, "reliverse.jsonc"))) ||
      (await fs.pathExists(path.join(cwd, "reliverse.ts")));

    // Check if root directory itself is a "valid" project (has package.json)
    const rootHasPackageJson = await fs.pathExists(
      path.join(cwd, "package.json"),
    );

    // If the root directory has a reliverse config file but no package.json,
    // and there's at least one detected project, show the project selection prompt
    if (
      (hasReliConfig && !rootHasPackageJson && detectedProjects.length > 0) ||
      (hasRootConfigOnly && detectedProjects.length > 0)
    ) {
      // Found projects or subdirectories with reliverse config
      relinka(
        "info",
        "Found Reliverse projects. Please select one to work on.",
      );

      // Create options for select prompt
      const projectOptions = detectedProjects.map(
        (project: DetectedProject) => ({
          label: project.name,
          value: project.path,
          hint: re.dim(path.relative(cwd, project.path)),
        }),
      );

      // Add option to create a new project
      projectOptions.push({
        label: "Create a new project",
        value: "new-project",
        hint: re.dim("Set up a new Reliverse project"),
      });

      // Show select prompt for user to choose a project
      const selectedProjectPath = await selectPrompt({
        title: "Select a Reliverse Project",
        content: "Choose a project to work on or create a new one",
        options: projectOptions,
      });

      // Handle selected project
      if (selectedProjectPath === "new-project") {
        // Ask for project name
        const projectName = await askProjectName({});

        // Create project directory
        const projectPath = path.resolve(cwd, projectName);
        await fs.ensureDir(projectPath);

        // Initialize package.json and tsconfig.json
        const isLib = await askAppOrLib();
        await createPackageJSON(projectPath, projectName, isLib);
        await createTSConfig(projectPath, isLib);

        // Trigger reliverse config generation
        await getReliverseConfig(projectPath, isDev);

        // Inform user and exit
        await nextStepsPrompt({
          title: `Created new project "${projectName}" with minimal Reliverse configuration.`,
          content: [
            "To continue setting up your project:",
            `1. cd ${projectName}`,
            "2. Edit the generated config files as needed",
            "3. Use '🔬 Open manual builder mode' again to continue setup",
          ],
        });

        try {
          await askOpenInIDE({ projectPath });
        } catch (error) {
          relinka(
            "warn",
            `Could not open project in IDE: ${error instanceof Error ? error.message : String(error)}`,
          );
        }

        process.exit(0);
      } else {
        // Continue with selected existing project
        // Update cwd to the selected project path
        params.cwd = selectedProjectPath;
        relinka(
          "info",
          `Working with project in ${path.relative(cwd, selectedProjectPath)}`,
        );
      }
    } else if (hasRootConfigOnly) {
      // If the root directory only has reliverse config and no subdirectories with projects,
      // proceed with creating a new project
      relinka(
        "info",
        `Directory '${path.basename(cwd)}' contains only Reliverse config. Setting up a new Reliverse project.`,
      );

      // Ask for project name
      const projectName = await askProjectName({});

      // Create project directory
      const projectPath = path.resolve(cwd, projectName);
      await fs.ensureDir(projectPath);

      // Initialize package.json and tsconfig.json
      const isLib = await askAppOrLib();
      await createPackageJSON(projectPath, projectName, isLib);
      await createTSConfig(projectPath, isLib);

      // Trigger reliverse config generation
      await getReliverseConfig(projectPath, isDev);

      // Inform user and exit
      await nextStepsPrompt({
        title: `Created new project "${projectName}" with minimal Reliverse configuration.`,
        content: [
          "To continue setting up your project:",
          `1. cd ${projectName}`,
          "2. Edit the generated config files as needed",
          "3. Use '🔬 Open manual builder mode' again to continue setup",
        ],
      });

      try {
        await askOpenInIDE({ projectPath });
      } catch (error) {
        relinka(
          "warn",
          `Could not open project in IDE: ${error instanceof Error ? error.message : String(error)}`,
        );
      }

      process.exit(0);
    }

    // Get project content to determine what to show
    const { requiredContent, optionalContent } = await getProjectContent(
      params.cwd,
    );

    // Check if dependencies need to be installed
    const hasMissingDeps =
      !optionalContent.dirNodeModules && requiredContent.filePackageJson;

    // If dependencies are missing, prompt to install them
    let areDependenciesMissing = hasMissingDeps;
    if (hasMissingDeps) {
      // askInstallDeps returns true if deps are still missing, false if installed
      areDependenciesMissing = await askInstallDeps(params.cwd);
    }

    // Check for template updates if config exists
    let updateAvailable = false;
    let updateInfo: TemplateUpdateInfo | null = null;

    if (requiredContent.fileReliverse) {
      // Get the reliverse config to check for updates
      const { configPath } = await getReliverseConfigPath(params.cwd);
      const projectConfig = await readReliverseConfig(configPath, isDev);

      if (projectConfig) {
        // Check if an update is available
        updateInfo = await checkForTemplateUpdate(projectConfig);
        updateAvailable = updateInfo.hasUpdate;
      }
    }

    // Determine if we should show the menu

    // Case 1: Project has package.json but no reliverse config - show menu to set up reliverse
    const isNewReliverseProject =
      !requiredContent.fileReliverse && requiredContent.filePackageJson;

    // Case 2: Project has all required content - show menu for existing project
    const isExistingProject = Object.values(requiredContent).every(
      (value) => value === true,
    );

    // Show appropriate menu based on project state
    if (isNewReliverseProject) {
      relinka(
        "info",
        "Project has package.json but no reliverse config. Setting up reliverse...",
      );
      await getReliverseConfig(params.cwd, isDev);
      relinka(
        "success",
        "Reliverse config created. Please run the command again to continue.",
      );
    } else if (isExistingProject) {
      // Show menu with options based on project state
      const menuOptions = [
        {
          label: "Install dependencies",
          value: "install-deps",
          hint: re.dim("npm/yarn/pnpm/bun install"),
          disabled: !areDependenciesMissing,
        },
        // Only show the update option if an update is available
        ...(updateAvailable && updateInfo
          ? [
              {
                label: "Update project template",
                value: "update-template",
                hint: re.dim(
                  `Current: ${updateInfo.currentDate.slice(0, 10)}, Latest: ${updateInfo.latestDate?.slice(0, 10)}`,
                ),
              },
            ]
          : []),
        {
          label: "Edit project settings",
          value: "edit-settings",
          hint: re.dim("modify reliverse config"),
        },
        {
          label: "👈 Exit",
          value: "exit",
        },
      ];

      const action = await selectPrompt({
        title: "Manual Builder Mode",
        content: updateAvailable
          ? re.yellow("! Update available for project template")
          : "Select an action to perform",
        options: menuOptions,
      });

      if (action === "install-deps") {
        await askInstallDeps(params.cwd);
      } else if (action === "update-template" && updateInfo?.latestDate) {
        // Update the project template date
        await updateProjectTemplateDate(
          params.cwd,
          updateInfo.latestDate,
          isDev,
        );
        relinka(
          "info",
          "Template date updated. You may need to manually pull the latest changes from the repository.",
        );
      } else if (action === "edit-settings") {
        relinka(
          "info",
          "Not implemented yet. Please edit your reliverse config file manually.",
        );
      }
    } else {
      relinka(
        "info",
        "Project doesn't meet requirements for manual builder menu.",
      );
      relinka(
        "info",
        "Please ensure you have a package.json and reliverse config file.",
      );
    }

    // Return dependency status for potential callers
    return { areDependenciesMissing };
  } catch (error) {
    console.error(
      "Error showing manual builder menu:",
      error instanceof Error ? error.message : String(error),
    );
    return { areDependenciesMissing: true };
  }
}
