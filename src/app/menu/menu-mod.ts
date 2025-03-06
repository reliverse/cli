import { selectPrompt } from "@reliverse/prompts";
import { relinka } from "@reliverse/prompts";
import { re } from "@reliverse/relico";
import fs from "fs-extra";
import path from "pathe";

import type { AppParams, ParamsOmitReli } from "~/app/app-types.js";
import type { ProjectCategory } from "~/libs/config/config-main.js";

import { endTitle, experimental, UNKNOWN_VALUE } from "~/app/constants.js";
import { getRandomMessage } from "~/app/db/messages.js";
import { aiChatHandler } from "~/utils/aiChatHandler.js";
import {
  detectProjectsWithReliverse,
  reReadReliverseConfig,
} from "~/utils/reliverseConfig.js";
import { reReadReliverseMemory } from "~/utils/reliverseMemory.js";

import { handleOpenProjectMenu } from "./create-project/cp-modules/cli-main-modules/cli-menu-items/detectedProjectsMenu.js";
import { rmTestsRuntime } from "./dev-submenu/dev-mod.js";
import { downloadRepoOption } from "./dev-submenu/dev-mod.js";
import { openVercelTools } from "./dev-submenu/dev-vercel.js";
import {
  optionCreateBrowserExtension,
  optionCreateVSCodeExtension,
  optionCreateWebProject,
} from "./menu-impl.js";

async function handleProjectCategory(params: AppParams) {
  const { cwd, isDev, memory, config, multireli, skipPrompts } = params;

  let projectCategory = config.projectCategory;
  if (projectCategory === UNKNOWN_VALUE) {
    const selectedType = await selectPrompt<ProjectCategory>({
      endTitle,
      title: getRandomMessage("initial"),
      options: [
        {
          label: "Web Application",
          value: "website",
          hint: re.dim("Create a website with Next.js"),
        },
        {
          label: "VS Code Extension",
          value: "vscode",
          hint: experimental,
        },
        {
          label: "Browser Extension",
          value: "browser",
          hint: experimental,
        },
        {
          label: "CLI Project",
          value: "cli",
          hint: experimental,
        },
        { separator: true },
        {
          label: re.italic(
            re.dim("More types of projects and frameworks coming soon 🦾"),
          ),
          value: UNKNOWN_VALUE,
          disabled: true,
        },
      ],
    });
    projectCategory = selectedType;
  }

  if (projectCategory === "vscode") {
    await optionCreateVSCodeExtension(
      params.projectName,
      cwd,
      isDev,
      memory,
      config,
      skipPrompts,
    );
  } else if (projectCategory === "browser") {
    await optionCreateBrowserExtension(
      params.projectName,
      cwd,
      isDev,
      memory,
      config,
      skipPrompts,
    );
  } else {
    // Default = "web"
    await optionCreateWebProject(
      params.projectName,
      cwd,
      isDev,
      memory,
      config,
      false,
      multireli,
      skipPrompts,
    );
  }
}

/**
 * Main entry point to show user a new project menu
 */
export async function showNewProjectMenu(params: AppParams): Promise<void> {
  const { cwd, isDev, memory, config, multireli, skipPrompts, projectName } =
    params;

  const isMultiConfig = multireli.length > 0;

  if (isMultiConfig) {
    relinka(
      "info",
      "Continuing with the multi-config mode (currently only web projects are supported)...",
    );
    await optionCreateWebProject(
      projectName,
      cwd,
      isDev,
      memory,
      config,
      isMultiConfig,
      multireli,
      skipPrompts,
    );
  } else {
    await handleProjectCategory(params);
  }
}

export async function showOpenProjectMenu(params: AppParams) {
  const { cwd, isDev, memory, config } = params;

  const searchPath = isDev ? path.join(cwd, "tests-runtime") : cwd;
  if (await fs.pathExists(searchPath)) {
    const detectedProjects = await detectProjectsWithReliverse(
      searchPath,
      isDev,
    );
    await handleOpenProjectMenu(
      detectedProjects,
      isDev,
      memory,
      cwd,
      true,
      config,
    );
  }
}

export async function showDevToolsMenu(params: ParamsOmitReli) {
  const { cwd, isDev, memory, config, skipPrompts } = params;
  const TestsRuntimePath = path.join(cwd, "tests-runtime");
  const TestsRuntimeExists = await fs.pathExists(TestsRuntimePath);

  const toolsOptions = {
    rmTestsRuntime: "rm-tests-runtime",
    downloadTemplate: "download-template",
    openVercelTools: "open-vercel-tools",
    reReadReliverse: "re-read-reliverse",
    aiChatTest: "ai-chat-test",
    exit: "exit",
  } as const;

  const option = await selectPrompt({
    title: "Dev tools menu",
    options: [
      ...(isDev && TestsRuntimeExists
        ? [
            {
              label: "remove tests-runtime dir",
              value: toolsOptions.rmTestsRuntime,
            },
          ]
        : []),
      ...(isDev
        ? [
            {
              label:
                "downloadRepo + cd(tests-runtime) + composeEnvFile + promptGitDeploy",
              value: toolsOptions.downloadTemplate,
            },
          ]
        : []),
      ...(isDev
        ? [
            {
              label: `Re-read config and memory ${experimental}`,
              value: toolsOptions.reReadReliverse,
            },
          ]
        : []),
      {
        label: `Open Vercel devtools ${experimental}`,
        value: toolsOptions.openVercelTools,
      },
      { label: "Test chat with Reliverse AI", value: toolsOptions.aiChatTest },
      { label: "👈 Exit", value: toolsOptions.exit },
    ],
  });

  if (option === toolsOptions.rmTestsRuntime) {
    await rmTestsRuntime(cwd);
  } else if (option === toolsOptions.downloadTemplate) {
    await downloadRepoOption(
      "blefnk/relivator",
      config,
      memory,
      isDev,
      cwd,
      skipPrompts,
    );
  } else if (option === toolsOptions.reReadReliverse) {
    await reReadReliverseConfig(isDev);
    await reReadReliverseMemory();
  } else if (option === toolsOptions.aiChatTest) {
    await aiChatHandler(memory);
  } else if (option === toolsOptions.openVercelTools) {
    await openVercelTools(memory);
  }
}
