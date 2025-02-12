import {
  selectPrompt,
  inputPrompt,
  multiselectPrompt,
  confirmPrompt,
} from "@reliverse/prompts";
import { relinka } from "@reliverse/prompts";
import { re } from "@reliverse/relico";
import { installDependencies } from "nypm";

import type { DetectedProject } from "~/utils/reliverseConfig.js";
import type { ReliverseConfig } from "~/utils/schemaConfig.js";
import type { ReliverseMemory } from "~/utils/schemaMemory.js";

import { experimental } from "~/app/constants.js";
import { deployProject } from "~/app/menu/create-project/cp-modules/git-deploy-prompts/deploy.js";
import {
  pushGitCommits,
  initGitDir,
  handleGithubRepo,
  createCommit,
} from "~/app/menu/create-project/cp-modules/git-deploy-prompts/git.js";
import { checkGithubRepoOwnership } from "~/app/menu/create-project/cp-modules/git-deploy-prompts/github.js";
import { ensureDbInitialized } from "~/app/menu/create-project/cp-modules/git-deploy-prompts/helpers/handlePkgJsonScripts.js";
import { checkVercelDeployment } from "~/app/menu/create-project/cp-modules/git-deploy-prompts/vercel/vercel-check.js";
import { manageDrizzleSchema } from "~/app/menu/project-editor/tools/drizzle/manageDrizzleSchema.js";
import { translateProjectUsingLanguine } from "~/app/menu/project-editor/tools/languine/languine-mod.js";
import {
  convertDatabaseProvider,
  convertPrismaToDrizzle,
} from "~/utils/codemods/convertDatabase.js";
import { getUsernameFrontend } from "~/utils/getUsernameFrontend.js";
import { handleCleanup } from "~/utils/handlers/handleCleanup.js";
import { handleCodemods } from "~/utils/handlers/handleCodemods.js";
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
} from "~/utils/handlers/shadcn.js";
import { initGithubSDK } from "~/utils/instanceGithub.js";
import { initVercelSDK } from "~/utils/instanceVercel.js";
import { checkScriptExists } from "~/utils/pkgJsonHelpers.js";

type ProjectMenuOption =
  | "git-deploy"
  | "languine"
  | "drizzle-schema"
  | "shadcn"
  | "convert-db"
  | "codemods"
  | "integrations"
  | "cleanup"
  | "exit";

// ──────────────────────────────────────────────
// Main Handler Function
// ──────────────────────────────────────────────
export async function handleOpenProjectMenu(
  projects: DetectedProject[],
  isDev: boolean,
  memory: ReliverseMemory,
  cwd: string,
  maskInput: boolean,
  config: ReliverseConfig,
): Promise<void> {
  const frontendUsername = await getUsernameFrontend(memory);
  if (!frontendUsername) {
    throw new Error(
      "Failed to determine your frontend username. Please try again or notify the CLI developers.",
    );
  }

  let selectedProject: DetectedProject | undefined;

  // (1) Determine the target project.
  if (projects.length === 1) {
    selectedProject = projects[0];
  } else {
    const projectOptions = projects.map((project) => ({
      label: `- ${project.name}`,
      value: project.path,
      ...(project.needsDepsInstall
        ? { hint: re.dim("no deps found, <enter> to install") }
        : project.hasGit && project.gitStatus
          ? {
              hint: re.dim(
                `${project.gitStatus?.uncommittedChanges ?? 0} uncommitted changes, ${project.gitStatus?.unpushedCommits ?? 0} unpushed commits`,
              ),
            }
          : {}),
    }));

    const selectedPath = await selectPrompt({
      title: "Select a project to manage",
      options: [...projectOptions, { label: "Exit", value: "exit" }],
    });

    if (selectedPath === "exit") return;

    selectedProject = projects.find((p) => p.path === selectedPath);
  }

  if (!selectedProject) {
    relinka("error", "Project not found");
    return;
  }

  // (2) Check for dependency installation.
  if (selectedProject.needsDepsInstall) {
    const shouldInstall = await confirmPrompt({
      title:
        "Dependencies are missing in your project. Do you want to install them?",
      content: re.bold(
        "🚨 Some features will be disabled until you install dependencies.",
      ),
    });
    if (shouldInstall) {
      relinka("info", "Installing dependencies...");
      try {
        await installDependencies({ cwd: selectedProject.path });
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

  const gitStatusInfo = selectedProject.hasGit
    ? ` (${selectedProject.gitStatus?.uncommittedChanges ?? 0} uncommitted changes, ${selectedProject.gitStatus?.unpushedCommits ?? 0} unpushed commits)`
    : "";
  const depsWarning = selectedProject.needsDepsInstall
    ? "Some features were disabled because dependencies are not installed."
    : "";

  // (3) Show Main Action Menu.
  const action = await selectPrompt<ProjectMenuOption>({
    title: `Managing ${selectedProject.name}${gitStatusInfo}`,
    content: depsWarning ? re.bold(depsWarning) : "",
    options: [
      {
        label: "Git and deploy operations",
        value: "git-deploy",
        hint: re.dim("Commit and push changes"),
      },
      {
        label: "Translate selected project",
        value: "languine",
        hint: re.dim("A powerful i18n tools"),
      },
      {
        label: selectedProject.needsDepsInstall
          ? re.gray(`- Code Modifications ${experimental}`)
          : `- Code Modifications ${experimental}`,
        value: "codemods",
        hint: re.dim("Apply code transformations"),
        disabled: selectedProject.needsDepsInstall,
      },
      {
        label: selectedProject.needsDepsInstall
          ? re.gray(`- Integrations ${experimental}`)
          : `- Integrations ${experimental}`,
        value: "integrations",
        hint: re.dim("Manage project integrations"),
        disabled: selectedProject.needsDepsInstall,
      },
      {
        label: selectedProject.needsDepsInstall
          ? re.gray(`- Database Operations ${experimental}`)
          : `- Database Operations ${experimental}`,
        value: "convert-db",
        hint: re.dim("Convert between database types"),
        disabled: selectedProject.needsDepsInstall,
      },
      {
        label: selectedProject.needsDepsInstall
          ? re.gray(`- Add shadcn/ui components ${experimental}`)
          : `- Add shadcn/ui components ${experimental}`,
        value: "shadcn",
        hint: re.dim("Manage UI components"),
        disabled: selectedProject.needsDepsInstall,
      },
      {
        label: selectedProject.needsDepsInstall
          ? re.gray(`- Drizzle Schema ${experimental}`)
          : `- Drizzle Schema ${experimental}`,
        value: "drizzle-schema",
        hint: re.dim("Manage database schema"),
        disabled: selectedProject.needsDepsInstall,
      },
      {
        label: selectedProject.needsDepsInstall
          ? re.gray(`- Cleanup Project ${experimental}`)
          : `- Cleanup Project ${experimental}`,
        value: "cleanup",
        hint: re.dim("Clean up project files"),
        disabled: selectedProject.needsDepsInstall,
      },
      { label: "👈 Exit", value: "exit", hint: re.dim("ctrl+c anywhere") },
    ],
  });

  if (action === "exit") return;

  // Initialize Github SDK
  const githubResult = await initGithubSDK(memory, frontendUsername, maskInput);
  if (!githubResult) {
    throw new Error(
      "Failed to initialize GitHub SDK. Please notify the CLI developers.",
    );
  }
  const [githubToken, githubInstance, githubUsername] = githubResult;

  // Initialize Vercel SDK
  const vercelResult = await initVercelSDK(memory, maskInput);
  if (!vercelResult) {
    throw new Error(
      "Failed to initialize Vercel SDK. Please notify the CLI developers.",
    );
  }
  const [vercelToken, vercelInstance] = vercelResult;

  // (4) Handle Actions
  switch (action) {
    case "git-deploy": {
      // --- Git and Deploy Operations ---
      let showCreateGithubOption = true;
      let hasGithubRepo = false;
      const hasDbPush = await checkScriptExists(
        selectedProject.path,
        "db:push",
      );
      const shouldRunDbPush = false; // preset flag

      const { exists, isOwner } = await checkGithubRepoOwnership(
        githubInstance,
        githubUsername,
        selectedProject.name,
      );
      showCreateGithubOption = !exists;
      hasGithubRepo = exists && isOwner;

      const gitOptions = [
        ...(selectedProject.hasGit
          ? [
              { label: "Create commit", value: "commit" },
              ...(selectedProject.gitStatus?.unpushedCommits && hasGithubRepo
                ? [
                    {
                      label: `- Push ${selectedProject.gitStatus.unpushedCommits} commits`,
                      value: "push",
                    },
                  ]
                : []),
            ]
          : [{ label: "Initialize Git repository", value: "init" }]),
        ...(showCreateGithubOption
          ? [
              {
                label: "Re/init git and create GitHub repository",
                value: "github",
              },
            ]
          : []),
        ...(selectedProject.hasGit && hasGithubRepo
          ? [{ label: "Deploy project", value: "deploy" }]
          : []),
        { label: "👈 Exit", value: "exit" },
      ];
      const gitAction = await selectPrompt({
        title: "Git and Deploy Operations",
        options: gitOptions,
      });
      if (gitAction === "exit") return;

      if (gitAction === "init") {
        relinka("info-verbose", "[A] initGitDir");
        const success = await initGitDir({
          cwd,
          isDev,
          projectPath: selectedProject.path,
          projectName: selectedProject.name,
          allowReInit: true,
          createCommit: true,
          config: selectedProject.config,
          isTemplateDownload: false,
        });
        if (success) {
          relinka("success", "Git repository initialized successfully");
          selectedProject.hasGit = true;
        }
      } else if (gitAction === "commit") {
        const message = await inputPrompt({ title: "Enter commit message" });
        if (message) {
          const success = await createCommit({
            cwd,
            isDev,
            projectPath: selectedProject.path,
            projectName: selectedProject.name,
            message,
            config: selectedProject.config,
            isTemplateDownload: false,
          });
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
        const success = await pushGitCommits({
          cwd,
          isDev,
          projectName: selectedProject.name,
          projectPath: selectedProject.path,
        });
        if (success) {
          relinka("success", "Commits pushed successfully");
          if (selectedProject.gitStatus) {
            selectedProject.gitStatus.unpushedCommits = 0;
          }
        }
      } else if (gitAction === "github") {
        const success = await handleGithubRepo({
          skipPrompts: false,
          cwd,
          isDev,
          memory,
          config,
          projectName: selectedProject.name,
          projectPath: selectedProject.path,
          maskInput,
          githubUsername,
          selectedTemplate: "blefnk/relivator",
          isTemplateDownload: false,
          githubInstance,
          githubToken,
        });
        if (success) {
          relinka("success", "GitHub repository created successfully");
        }
      } else if (gitAction === "deploy") {
        const dbStatus = await ensureDbInitialized(
          hasDbPush,
          shouldRunDbPush,
          selectedProject.needsDepsInstall ?? false,
          selectedProject.path,
        );
        if (dbStatus === "cancel") {
          relinka("info", "Deployment cancelled.");
          return;
        }

        // Check if a deployment already exists
        const isDeployed = await checkVercelDeployment(
          selectedProject.name,
          githubUsername,
          githubToken,
          githubInstance,
        );
        if (isDeployed) {
          relinka(
            "success",
            "Project already has Vercel deployments configured on GitHub.",
            "New deployments are automatically triggered on new commits.",
          );
          return;
        }
        relinka(
          "info",
          "No existing deployment found. Initializing new deployment...",
        );
        const { deployService } = await deployProject(
          githubInstance,
          vercelInstance,
          vercelToken,
          githubToken,
          false,
          selectedProject.name,
          selectedProject.config,
          selectedProject.path,
          "",
          memory,
          "update",
          githubUsername,
        );
        if (deployService !== "none") {
          relinka(
            "success",
            `Project deployed successfully to ${deployService.charAt(0).toUpperCase() + deployService.slice(1)}`,
          );
        }
      }
      break;
    }

    case "languine": {
      await translateProjectUsingLanguine(selectedProject.path);
      break;
    }

    case "codemods": {
      await handleCodemods(selectedProject.config, selectedProject.path);
      break;
    }

    case "integrations": {
      await handleIntegrations(selectedProject.path, isDev);
      break;
    }

    case "convert-db": {
      const conversionType = await selectPrompt({
        title: "What kind of conversion would you like to perform?",
        options: [
          {
            label: "Convert from Prisma to Drizzle",
            value: "prisma-to-drizzle",
          },
          { label: "Convert database provider", value: "change-provider" },
        ],
      });
      if (conversionType === "prisma-to-drizzle") {
        const targetDb = await selectPrompt({
          title: "Select target database type:",
          options: [
            { label: "PostgreSQL", value: "postgres" },
            { label: "MySQL", value: "mysql" },
            { label: "SQLite", value: "sqlite" },
          ],
        });
        await convertPrismaToDrizzle(selectedProject.path, targetDb);
      } else if (conversionType === "change-provider") {
        const fromProvider = await selectPrompt({
          title: "Convert from:",
          options: [
            { label: "PostgreSQL", value: "postgres" },
            { label: "MySQL", value: "mysql" },
            { label: "SQLite", value: "sqlite" },
          ],
        });
        const toProviderOptions = [
          { label: "PostgreSQL", value: "postgres" },
          { label: "MySQL", value: "mysql" },
          { label: "SQLite", value: "sqlite" },
        ];
        if (fromProvider === "postgres") {
          toProviderOptions.push({ label: "LibSQL/Turso", value: "libsql" });
        }
        const toProvider = await selectPrompt({
          title: "Convert to:",
          options: toProviderOptions.filter(
            (opt) => opt.value !== fromProvider,
          ),
        });
        await convertDatabaseProvider(
          selectedProject.path,
          fromProvider,
          toProvider,
        );
      }
      break;
    }

    case "shadcn": {
      const shadcnConfig = await readShadcnConfig(selectedProject.path);
      if (!shadcnConfig) {
        relinka("error", "shadcn/ui configuration file not found");
        return;
      }
      const shadcnAction = await selectPrompt({
        title: "What would you like to do?",
        options: [
          { label: "Add Components", value: "add" },
          { label: "Remove Components", value: "remove" },
          { label: "Update Components", value: "update" },
          { label: "Change Theme", value: "theme" },
          { label: "Install sidebars", value: "sidebars" },
          { label: "Install charts", value: "charts" },
        ],
      });
      switch (shadcnAction) {
        case "sidebars":
          selectSidebarPrompt(selectedProject.path);
          break;
        case "charts":
          selectChartsPrompt(selectedProject.path);
          break;
        case "add": {
          const installedComponents = await getInstalledComponents(
            selectedProject.path,
            shadcnConfig,
          );
          const availableComponents = AVAILABLE_COMPONENTS.filter(
            (c) => !installedComponents.includes(c),
          );
          const components = await multiselectPrompt({
            title: "Select components to add:",
            options: availableComponents.map((c) => ({ label: c, value: c })),
          });
          for (const component of components) {
            await installComponent(selectedProject.path, component);
          }
          break;
        }
        case "remove": {
          const installedComponents = await getInstalledComponents(
            selectedProject.path,
            shadcnConfig,
          );
          const components = await multiselectPrompt({
            title: "Select components to remove:",
            options: installedComponents.map((c) => ({ label: c, value: c })),
          });
          for (const component of components) {
            await removeComponent(
              selectedProject.path,
              shadcnConfig,
              component,
            );
          }
          break;
        }
        case "update": {
          const installedComponents = await getInstalledComponents(
            selectedProject.path,
            shadcnConfig,
          );
          const components = await multiselectPrompt({
            title: "Select components to update:",
            options: installedComponents.map((c) => ({ label: c, value: c })),
          });
          for (const component of components) {
            await updateComponent(selectedProject.path, component);
          }
          break;
        }
        case "theme": {
          const theme = await selectPrompt({
            title: "Select a theme:",
            options: THEMES.map((t) => ({ label: t.name, value: t.name })),
          });
          const selectedTheme = THEMES.find((t) => t.name === theme);
          if (selectedTheme) {
            await applyTheme(selectedProject.path, shadcnConfig, selectedTheme);
          }
          break;
        }
      }
      break;
    }

    case "drizzle-schema": {
      await manageDrizzleSchema(selectedProject.path, false);
      break;
    }

    case "cleanup": {
      await handleCleanup(cwd, selectedProject.path, isDev);
      break;
    }

    default: {
      relinka("error", "Invalid action selected");
      break;
    }
  }
}
