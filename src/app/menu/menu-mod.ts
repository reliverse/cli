import { selectPrompt } from "@reliverse/prompts";
import { relinka } from "@reliverse/relinka";
import fs from "fs-extra";
import path from "node:path";
import pc from "picocolors";

import type { AppParams, ParamsOmitReli } from "~/app/app-types.js";
import type { ProjectCategory } from "~/utils/schemaConfig.js";

import { experimental, UNKNOWN_VALUE } from "~/app/constants.js";
import { getRandomMessage } from "~/app/db/messages.js";
import { downloadTemplateOption } from "~/dev.js";
import { rmTestsRuntime } from "~/dev.js";
import { aiChatHandler } from "~/utils/aiChatHandler.js";
import { detectProjectsWithReliverse } from "~/utils/reliverseConfig.js";

import { handleOpenProjectMenu } from "./create-project/cp-modules/cli-main-modules/detections/detectedProjectsMenu.js";
import {
  optionCreateBrowserExtension,
  optionCreateVSCodeExtension,
  optionCreateWebProject,
} from "./menu-impl.js";

/**
 * Main entry point to show user a new project menu
 */
export async function showNewProjectMenu(params: AppParams): Promise<void> {
  const { cwd, isDev, memory, config, reli, skipPrompts, projectName } = params;

  const endTitle =
    "📚 Check the docs to learn more: https://docs.reliverse.org";

  const isMultiConfig = reli.length > 0;

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
      endTitle,
      isMultiConfig,
      reli,
      skipPrompts,
    );
  } else {
    let projectCategory = config.projectCategory;
    if (projectCategory === UNKNOWN_VALUE) {
      // Display the menu to let the user pick a project type
      const selectedType = await selectPrompt<ProjectCategory>({
        endTitle,
        title: getRandomMessage("initial"),
        options: [
          {
            label: "Web Application",
            value: "website",
            hint: pc.dim("Create a website with Next.js"),
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
            label: pc.italic(
              pc.dim("More types of projects and frameworks coming soon 🦾"),
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
        endTitle,
        skipPrompts,
      );
    } else if (projectCategory === "browser") {
      await optionCreateBrowserExtension(
        params.projectName,
        cwd,
        isDev,
        memory,
        config,
        endTitle,
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
        endTitle,
        false,
        reli,
        skipPrompts,
      );
    }
  }
}

export async function showOpenProjectMenu(params: AppParams) {
  const { cwd, isDev, memory, config } = params;

  const searchPath = isDev ? path.join(cwd, "tests-runtime") : cwd;
  if (await fs.pathExists(searchPath)) {
    const detectedProjects = await detectProjectsWithReliverse(searchPath);
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

  const option = await selectPrompt({
    title: "Dev tools menu",
    options: [
      ...(TestsRuntimeExists
        ? [{ label: "remove tests-runtime dir", value: "rm-tests-runtime" }]
        : []),
      {
        label:
          "downloadTemplate + cd tests-runtime + composeEnvFile + promptGitDeploy",
        value: "download-template",
      },
      {
        label: "Create config or force re-population",
        value: "force-populate-config",
      },
      { label: "Test chat with Reliverse AI", value: "ai-chat-test" },
      { label: "Exit", value: "exit" },
    ],
  });

  if (option === "rm-tests-runtime") {
    await rmTestsRuntime(cwd);
  } else if (option === "download-template") {
    await downloadTemplateOption(
      "blefnk/relivator",
      config,
      memory,
      isDev,
      cwd,
      skipPrompts,
    );
  } else if (option === "ai-chat-test") {
    await aiChatHandler(memory);
  }
}
