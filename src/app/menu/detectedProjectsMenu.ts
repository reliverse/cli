import {
  selectPrompt,
  inputPrompt,
  multiselectPrompt,
  confirmPrompt,
} from "@reliverse/prompts";
import { installDependencies } from "nypm";
import pc from "picocolors";

import type { DetectedProject } from "~/types.js";

import {
  createGitCommit,
  pushGitCommits,
} from "~/app/menu/git-deploy-prompts/helpers/git.js";
import { relinka } from "~/utils/console.js";
import {
  convertPrismaToDrizzle,
  convertDatabaseProvider,
} from "~/utils/handlers/codemods/convertDatabase.js";
import { handleCleanup } from "~/utils/handlers/handleCleanup.js";
import { handleCodemods } from "~/utils/handlers/handleCodemods.js";
import { handleConfigEditing } from "~/utils/handlers/handleConfigEdits.js";
import { handleIntegrations } from "~/utils/handlers/handleIntegrations.js";
import {
  readShadcnConfig,
  getInstalledComponents,
  installComponent,
  removeComponent,
  updateComponent,
  applyTheme,
  AVAILABLE_COMPONENTS,
  THEMES,
  selectChartsPrompt,
  selectSidebarPrompt,
} from "~/utils/shadcn.js";

import { manageDrizzleSchema } from "./manageDrizzleSchema.js";

export async function showDetectedProjectsMenu(
  projects: DetectedProject[],
): Promise<void> {
  let selectedProject: DetectedProject | undefined;

  // If only one project is detected, use it directly
  if (projects.length === 1) {
    selectedProject = projects[0];
  } else {
    // Show selection menu only if multiple projects are detected
    const projectOptions = projects.map((project) => ({
      label: `- ${project.name}`,
      value: project.path,
      ...(project.needsDepsInstall
        ? { hint: pc.dim("no deps found, enter to install") }
        : project.hasGit && project.gitStatus
          ? {
              hint: pc.dim(
                `${project.gitStatus.uncommittedChanges ?? 0} uncommitted changes, ${
                  project.gitStatus.unpushedCommits ?? 0
                } unpushed commits`,
              ),
            }
          : {}),
    }));

    const selectedPath = await selectPrompt({
      title: "Select a project to manage",
      options: [...projectOptions, { label: "- Exit", value: "exit" }],
    });

    if (selectedPath === "exit") {
      return;
    }

    selectedProject = projects.find((p) => p.path === selectedPath);
  }

  if (!selectedProject) {
    relinka("error", "Project not found");
    return;
  }

  let shouldInstallDeps = false;
  if (selectedProject.needsDepsInstall) {
    shouldInstallDeps = await confirmPrompt({
      title:
        "Dependencies are missing in your project. Do you want to install them to continue? After that, we will open project manager.",
    });

    if (!shouldInstallDeps) {
      process.exit(0);
    }

    relinka("info", "Installing dependencies...");
    try {
      await installDependencies({
        cwd: selectedProject.path,
      });
      relinka("success", "Dependencies installed successfully");
      selectedProject.needsDepsInstall = false;
    } catch (error) {
      relinka(
        "error",
        "Failed to install dependencies:",
        error instanceof Error ? error.message : String(error),
      );
      return;
    }
  }

  const gitStatusTitle = selectedProject.hasGit
    ? ` (${selectedProject.gitStatus?.uncommittedChanges ?? 0} uncommitted changes, ${
        selectedProject.gitStatus?.unpushedCommits ?? 0
      } unpushed commits)`
    : "";

  const action = await selectPrompt({
    title: `Managing ${selectedProject.name}${gitStatusTitle}`,
    options: [
      {
        label: `- ${pc.redBright("[🚨 Experimental]")} Git Operations`,
        value: "git",
        hint: pc.dim("Commit and push changes"),
      },
      {
        label: `- ${pc.redBright("[🚨 Experimental]")} Code Modifications`,
        value: "codemods",
        hint: pc.dim("Apply code transformations"),
      },
      {
        label: `- ${pc.redBright("[🚨 Experimental]")} Integrations`,
        value: "integration",
        hint: pc.dim("Manage project integrations"),
      },
      {
        label: `- ${pc.redBright("[🚨 Experimental]")} Database Operations`,
        value: "convert-db",
        hint: pc.dim("Convert between database types"),
      },
      {
        label: `- ${pc.redBright("[🚨 Experimental]")} Shadcn/UI Components`,
        value: "shadcn",
        hint: pc.dim("Manage UI components"),
      },
      {
        label: `- ${pc.redBright("[🚨 Experimental]")} Drizzle Schema`,
        value: "drizzle-schema",
        hint: pc.dim("Manage database schema"),
      },
      {
        label: `- ${pc.redBright("[🚨 Experimental]")} Cleanup Project`,
        value: "cleanup",
        hint: pc.dim("Clean up project files"),
      },
      {
        label: `- ${pc.redBright("[🚨 Experimental]")} Edit Configuration`,
        value: "edit-config",
        hint: pc.dim("Modify project settings"),
      },
      { label: "👈 Exit", value: "exit", hint: pc.dim("ctrl+c anywhere") },
    ],
  });

  if (action === "git") {
    if (!selectedProject.hasGit) {
      relinka("error", "No Git repository found in this project");
      return;
    }

    const gitAction = await selectPrompt({
      title: "Git Operations",
      options: [
        {
          label: "- Create commit",
          value: "commit",
        },
        ...(selectedProject.gitStatus?.unpushedCommits
          ? [
              {
                label: `Push ${selectedProject.gitStatus.unpushedCommits} commits`,
                value: "push",
              },
            ]
          : []),
        { label: "- Exit", value: "exit" },
      ],
    });

    if (gitAction === "commit") {
      const message = await inputPrompt({
        title: "Enter commit message",
      });

      if (message) {
        const success = await createGitCommit({
          message,
          projectPath: selectedProject.path,
        });

        if (success) {
          relinka("success", "Commit created successfully");
        }
      }
    } else if (gitAction === "push") {
      const success = await pushGitCommits(selectedProject.path);
      if (success) {
        relinka("success", "Commits pushed successfully");
      }
    }
  } else if (action === "codemods") {
    await handleCodemods(selectedProject.config, selectedProject.path);
  } else if (action === "integration") {
    await handleIntegrations(selectedProject.path);
  } else if (action === "convert-db") {
    const conversionType = await selectPrompt({
      title: "What kind of conversion would you like to perform?",
      options: [
        {
          label: "- Convert from Prisma to Drizzle",
          value: "prisma-to-drizzle",
        },
        { label: "- Convert database provider", value: "change-provider" },
      ],
    });

    if (conversionType === "prisma-to-drizzle") {
      const targetDb = await selectPrompt({
        title: "Select target database type:",
        options: [
          { label: "- PostgreSQL", value: "postgres" },
          { label: "- MySQL", value: "mysql" },
          { label: "- SQLite", value: "sqlite" },
        ],
      });

      await convertPrismaToDrizzle(selectedProject.path, targetDb);
    } else if (conversionType === "change-provider") {
      const fromProvider = await selectPrompt({
        title: "Convert from:",
        options: [
          { label: "- PostgreSQL", value: "postgres" },
          { label: "- MySQL", value: "mysql" },
          { label: "- SQLite", value: "sqlite" },
        ],
      });

      const toProviderOptions = [
        { label: "- PostgreSQL", value: "postgres" },
        { label: "- MySQL", value: "mysql" },
        { label: "- SQLite", value: "sqlite" },
      ];

      if (fromProvider === "postgres") {
        toProviderOptions.push({ label: "- LibSQL/Turso", value: "libsql" });
      }

      const toProvider = await selectPrompt({
        title: "Convert to:",
        options: toProviderOptions.filter((opt) => opt.value !== fromProvider),
      });

      await convertDatabaseProvider(
        selectedProject.path,
        fromProvider,
        toProvider,
      );
    }
  } else if (action === "shadcn") {
    const shadcnConfig = await readShadcnConfig(selectedProject.path);
    if (!shadcnConfig) {
      relinka("error", "shadcn/ui configuration not found");
      return;
    }

    const shadcnAction = await selectPrompt({
      title: "What would you like to do?",
      options: [
        { label: "- Add Components", value: "add" },
        { label: "- Remove Components", value: "remove" },
        { label: "- Update Components", value: "update" },
        { label: "- Change Theme", value: "theme" },
        { label: "- Install sidebars", value: "sidebars" },
        { label: "- Install charts", value: "charts" },
      ],
    });

    if (shadcnAction === "sidebars") {
      selectSidebarPrompt(selectedProject.path);
    } else if (shadcnAction === "charts") {
      selectChartsPrompt(selectedProject.path);
    } else if (shadcnAction === "add") {
      const installedComponents = await getInstalledComponents(
        selectedProject.path,
        shadcnConfig,
      );
      const availableComponents = AVAILABLE_COMPONENTS.filter(
        (c) => !installedComponents.includes(c),
      );

      const components = await multiselectPrompt({
        title: "Select components to add:",
        options: availableComponents.map((c) => ({
          label: c,
          value: c,
        })),
      });

      for (const component of components) {
        await installComponent(selectedProject.path, component);
      }
    } else if (shadcnAction === "remove") {
      const installedComponents = await getInstalledComponents(
        selectedProject.path,
        shadcnConfig,
      );

      const components = await multiselectPrompt({
        title: "Select components to remove:",
        options: installedComponents.map((c) => ({
          label: c,
          value: c,
        })),
      });

      for (const component of components) {
        await removeComponent(selectedProject.path, shadcnConfig, component);
      }
    } else if (shadcnAction === "update") {
      const installedComponents = await getInstalledComponents(
        selectedProject.path,
        shadcnConfig,
      );

      const components = await multiselectPrompt({
        title: "Select components to update:",
        options: installedComponents.map((c) => ({
          label: c,
          value: c,
        })),
      });

      for (const component of components) {
        await updateComponent(selectedProject.path, component);
      }
    } else if (shadcnAction === "theme") {
      const theme = await selectPrompt({
        title: "Select a theme:",
        options: THEMES.map((t) => ({
          label: t.name,
          value: t.name,
        })),
      });

      const selectedTheme = THEMES.find((t) => t.name === theme);
      if (selectedTheme) {
        await applyTheme(selectedProject.path, shadcnConfig, selectedTheme);
      }
    }
  } else if (action === "drizzle-schema") {
    await manageDrizzleSchema(selectedProject.path, false);
  } else if (action === "cleanup") {
    await handleCleanup(selectedProject.path);
  } else if (action === "edit-config") {
    await handleConfigEditing(selectedProject.path);
  }
}
