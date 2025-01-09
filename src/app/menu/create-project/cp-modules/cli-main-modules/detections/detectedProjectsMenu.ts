import {
  selectPrompt,
  inputPrompt,
  multiselectPrompt,
  confirmPrompt,
} from "@reliverse/prompts";
import { installDependencies } from "nypm";
import pc from "picocolors";

import type { DetectedProject } from "~/types.js";

import { relinka } from "~/app/menu/create-project/cp-modules/cli-main-modules/handlers/logger.js";
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
} from "~/app/menu/create-project/cp-modules/cli-main-modules/handlers/shadcn.js";
import { askGithubName } from "~/app/menu/create-project/cp-modules/cli-main-modules/modules/askGithubName.js";
import { deployProject } from "~/app/menu/create-project/cp-modules/git-deploy-prompts/deploy.js";
import {
  createGitCommit,
  pushGitCommits,
  initGit,
  createGithubRepository,
} from "~/app/menu/create-project/cp-modules/git-deploy-prompts/git.js";
import { readReliverseMemory } from "~/args/memory/impl.js";

import { checkScriptExists } from "../../../cp-impl.js";
import { checkGithubRepoOwnership } from "../../git-deploy-prompts/github.js";
import { ensureDbInitialized } from "../../git-deploy-prompts/helpers/handlePkgJsonScripts.js";
import { createOctokitInstance } from "../../git-deploy-prompts/octokit-instance.js";
import { manageDrizzleSchema } from "../drizzle/manageDrizzleSchema.js";
import {
  convertDatabaseProvider,
  convertPrismaToDrizzle,
} from "../handlers/codemods/convertDatabase.js";
import { handleCleanup } from "../handlers/handleCleanup.js";
import { handleCodemods } from "../handlers/handleCodemods.js";
import { handleConfigEditing } from "../handlers/handleConfigEdits.js";
import { handleIntegrations } from "../handlers/handleIntegrations.js";

export async function showDetectedProjectsMenu(
  projects: DetectedProject[],
  isDev: boolean,
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
        "Dependencies are missing in your project. Do you want to install them?",
      content: "Some features will be disabled until you install dependencies.",
    });

    if (shouldInstallDeps) {
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
  }

  const gitStatusTitle = selectedProject.hasGit
    ? ` (${selectedProject.gitStatus?.uncommittedChanges ?? 0} uncommitted changes, ${
        selectedProject.gitStatus?.unpushedCommits ?? 0
      } unpushed commits)`
    : "";

  const experimental = pc.dim(pc.red("[🚨 Experimental]"));
  const needsDepsInstall = selectedProject.needsDepsInstall ?? false;

  const action = await selectPrompt({
    title: `Managing ${selectedProject.name}${gitStatusTitle}`,
    options: [
      {
        label: "- Git and Deploy Operations",
        value: "git-deploy",
        hint: pc.dim("Commit and push changes"),
      },
      {
        label: `- Code Modifications ${experimental}`,
        value: "codemods",
        hint: pc.dim("Apply code transformations"),
        disabled: needsDepsInstall,
      },
      {
        label: `- Integrations ${experimental}`,
        value: "integration",
        hint: pc.dim("Manage project integrations"),
        disabled: needsDepsInstall,
      },
      {
        label: `- Database Operations ${experimental}`,
        value: "convert-db",
        hint: pc.dim("Convert between database types"),
        disabled: needsDepsInstall,
      },
      {
        label: `- Shadcn/UI Components ${experimental}`,
        value: "shadcn",
        hint: pc.dim("Manage UI components"),
        disabled: needsDepsInstall,
      },
      {
        label: `- Drizzle Schema ${experimental}`,
        value: "drizzle-schema",
        hint: pc.dim("Manage database schema"),
        disabled: needsDepsInstall,
      },
      {
        label: `- Cleanup Project ${experimental}`,
        value: "cleanup",
        hint: pc.dim("Clean up project files"),
        disabled: needsDepsInstall,
      },
      {
        label: `- Edit Configuration ${experimental}`,
        value: "edit-config",
        hint: pc.dim("Modify project settings"),
        disabled: needsDepsInstall,
      },
      { label: "👈 Exit", value: "exit", hint: pc.dim("ctrl+c anywhere") },
    ],
  });

  if (action === "git-deploy") {
    // Check GitHub repository existence before showing menu
    let showCreateGithubOption = true;
    let hasGithubRepo = false;
    const memory = await readReliverseMemory();
    const hasDbPush = await checkScriptExists(selectedProject.path, "db:push");
    const shouldRunDbPush = false;

    if (memory?.githubKey) {
      const githubUsername = await askGithubName();
      if (githubUsername) {
        const octokit = createOctokitInstance(memory.githubKey);
        const { exists, isOwner } = await checkGithubRepoOwnership(
          octokit,
          githubUsername,
          selectedProject.name,
        );
        showCreateGithubOption = !exists;
        hasGithubRepo = exists && isOwner;
      }
    }

    const gitAction = await selectPrompt({
      title: "Git and Deploy Operations",
      options: [
        ...(selectedProject.hasGit
          ? [
              {
                label: "- Create commit",
                value: "commit",
              },
              ...(selectedProject.gitStatus?.unpushedCommits && hasGithubRepo
                ? [
                    {
                      label: `- Push ${selectedProject.gitStatus.unpushedCommits} commits`,
                      value: "push",
                    },
                  ]
                : []),
            ]
          : [
              {
                label: "- Initialize Git repository",
                value: "init",
              },
            ]),
        ...(showCreateGithubOption
          ? [
              {
                label: "- Create GitHub repository",
                value: "github",
              },
            ]
          : []),
        ...(selectedProject.hasGit && hasGithubRepo
          ? [
              {
                label: "- Deploy project",
                value: "deploy",
              },
            ]
          : []),
        { label: "👈 Exit", value: "exit" },
      ],
    });

    if (gitAction === "init") {
      const success = await initGit(selectedProject.path, isDev);
      if (success) {
        relinka("success", "Git repository initialized successfully");
        selectedProject.hasGit = true;
      }
    } else if (gitAction === "commit") {
      const message = await inputPrompt({
        title: "Enter commit message",
      });

      if (message) {
        const success = await createGitCommit(
          message,
          selectedProject.path,
          isDev,
          selectedProject.name,
        );

        if (success) {
          relinka("success", "Commit created successfully");
          if (selectedProject.gitStatus) {
            selectedProject.gitStatus.unpushedCommits =
              (selectedProject.gitStatus.unpushedCommits || 0) + 1;
            selectedProject.gitStatus.uncommittedChanges = 0;
          }
        }
      }
    } else if (gitAction === "push") {
      const success = await pushGitCommits(
        selectedProject.path,
        isDev,
        selectedProject.name,
      );
      if (success) {
        relinka("success", "Commits pushed successfully");
        if (selectedProject.gitStatus) {
          selectedProject.gitStatus.unpushedCommits = 0;
        }
      }
    } else if (gitAction === "github") {
      const success = await createGithubRepository(
        selectedProject.name,
        selectedProject.path,
        isDev,
      );
      if (success) {
        relinka("success", "GitHub repository created successfully");
      }
    } else if (gitAction === "deploy") {
      const dbStatus = await ensureDbInitialized(
        hasDbPush,
        shouldRunDbPush,
        shouldInstallDeps,
        selectedProject.path,
      );

      if (dbStatus === "cancel") {
        relinka("info", "Deployment cancelled.");
        return;
      }

      const { deployService } = await deployProject(
        selectedProject.name,
        selectedProject.config,
        selectedProject.path,
        "",
      );

      if (deployService !== "none") {
        relinka(
          "success",
          `Project deployed successfully to ${
            deployService.charAt(0).toUpperCase() + deployService.slice(1)
          }`,
        );
      }
    }
  } else if (action === "codemods") {
    await handleCodemods(selectedProject.config, selectedProject.path);
  } else if (action === "integration") {
    await handleIntegrations(selectedProject.path, isDev);
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
