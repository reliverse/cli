import { selectPrompt, inputPrompt } from "@reliverse/prompts";
import { relinka } from "@reliverse/prompts";
import { re } from "@reliverse/relico";

import type { ReliverseConfig } from "~/libs/config/config-main.js";
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
import { manageDrizzleSchema } from "~/app/menu/manual-mode/deprecated/drizzle/manageDrizzleSchema.js";
import { handleIntegrations } from "~/app/menu/manual-mode/deprecated/editor-impl.js";
import { useAddonLanguine } from "~/app/menu/manual-mode/deprecated/languine/languine-mod.js";
import { manageShadcn } from "~/app/menu/manual-mode/deprecated/shadcn/shadcn-mod.js";
import { installDepsPrompt } from "~/app/prompts/deps-prompts.js";
import { envArgImpl } from "~/arg/env/env-impl.js";
import {
  convertDatabaseProvider,
  convertPrismaToDrizzle,
} from "~/utils/codemods/convertDatabase.js";
import { getUsernameFrontend } from "~/utils/getUsernameFrontend.js";
import { handleCleanup } from "~/utils/handlers/handleCleanup.js";
import { handleCodemods } from "~/utils/handlers/handleCodemods.js";
import { initGithubSDK } from "~/utils/instanceGithub.js";
import { initVercelSDK } from "~/utils/instanceVercel.js";
import { checkScriptExists } from "~/utils/pkgJsonHelpers.js";
import {
  getProjectContent,
  type DetectedProject,
} from "~/utils/reliverseConfig.js";

type ProjectMenuOption =
  | "git-deploy"
  | "languine"
  | "drizzle-schema"
  | "shadcn"
  | "convert-db"
  | "codemods"
  | "integrations"
  | "cleanup"
  | "env"
  | "updater"
  | "i18n"
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
  const frontendUsername = await getUsernameFrontend(memory, false);
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
      label: project.name,
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
    await installDepsPrompt(selectedProject.path);
  }

  const projectContent = await getProjectContent(selectedProject.path);
  const hasNodeModules = projectContent.optionalContent.dirNodeModules;

  const gitStatusInfo = selectedProject.hasGit
    ? ` (${selectedProject.gitStatus?.uncommittedChanges ?? 0} uncommitted changes, ${selectedProject.gitStatus?.unpushedCommits ?? 0} unpushed commits)`
    : "";
  const depsWarning = hasNodeModules
    ? ""
    : "Some addons were disabled because dependencies are not installed.";

  // (3) Show Main Action Menu.
  const action = await selectPrompt<ProjectMenuOption>({
    title: `[@reliverse/addons] Managing project: ${selectedProject.name}${gitStatusInfo}`,
    content: depsWarning ? re.bold(depsWarning) : "",
    options: [
      {
        label: "Git and deploy operations",
        value: "git-deploy",
        hint: re.dim("commit and push changes"),
      },
      {
        label: "Translate selected project",
        value: "languine",
        hint: re.dim("powerful i18n addon"),
      },
      {
        label: "Compose .env file",
        value: "env",
        hint: re.dim("create .env file"),
      },
      {
        label: !hasNodeModules
          ? re.gray(`Code modifications ${experimental}`)
          : `Code modifications ${experimental}`,
        value: "codemods",
        hint: re.dim("apply code transformations"),
        disabled: !hasNodeModules,
      },
      {
        label: !hasNodeModules
          ? re.gray(`Integrations ${experimental}`)
          : `Integrations ${experimental}`,
        value: "integrations",
        hint: re.dim("manage project integrations"),
        disabled: !hasNodeModules,
      },
      {
        label: !hasNodeModules
          ? re.gray(`Database operations ${experimental}`)
          : `Database operations ${experimental}`,
        value: "convert-db",
        hint: re.dim("convert between database types"),
        disabled: !hasNodeModules,
      },
      {
        label: !hasNodeModules
          ? re.gray(`Add shadcn/ui components ${experimental}`)
          : `Add shadcn/ui components ${experimental}`,
        value: "shadcn",
        hint: re.dim("manage ui components"),
        disabled: !hasNodeModules,
      },
      {
        label: !hasNodeModules
          ? re.gray(`Drizzle schema ${experimental}`)
          : `Drizzle schema ${experimental}`,
        value: "drizzle-schema",
        hint: re.dim("manage database schema"),
        disabled: !hasNodeModules,
      },
      {
        label: !hasNodeModules
          ? re.gray(`Cleanup project ${experimental}`)
          : `Cleanup project ${experimental}`,
        value: "cleanup",
        hint: re.dim("clean up project files"),
        disabled: !hasNodeModules,
      },
      {
        label: "👈 Exit",
        value: "exit",
        hint: re.dim("press ctrl+c at any time"),
      },
    ],
  });

  if (action === "exit") return;

  // (4) Handle Actions
  switch (action) {
    case "git-deploy": {
      // Initialize Github SDK
      const githubResult = await initGithubSDK(
        memory,
        frontendUsername,
        maskInput,
      );
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
                      label: `Push ${selectedProject.gitStatus.unpushedCommits} commits`,
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
          !hasNodeModules,
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
      await useAddonLanguine(selectedProject.path);
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
      await manageShadcn(selectedProject.path);
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

    case "env": {
      await envArgImpl(isDev, selectedProject.path);
      break;
    }

    case "updater": {
      // await handleUpdater(selectedProject.path);
      break;
    }

    case "i18n": {
      // await handleI18n(selectedProject.path);
      break;
    }

    default: {
      relinka("error", "Invalid action selected");
      break;
    }
  }
}
