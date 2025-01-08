import { pm, selectPrompt } from "@reliverse/prompts";
import fs from "fs-extra";
import path from "pathe";

import type { ReliverseConfig } from "~/types.js";

import { getMainMenuOptions } from "~/app/menu/create-project/cp-modules/cli-main-modules/cli-menu-items/getMainMenuOptions.js";
import { generateDefaultRulesForProject } from "~/app/menu/create-project/cp-modules/cli-main-modules/configs/generateDefaultRulesForProject.js";
import { detectProjectType } from "~/app/menu/create-project/cp-modules/cli-main-modules/configs/miscellaneousConfigHelpers.js";
import {
  readReliverseConfig,
  writeReliverseConfig,
} from "~/app/menu/create-project/cp-modules/cli-main-modules/configs/reliverseReadWrite.js";
import { showDetectedProjectsMenu } from "~/app/menu/create-project/cp-modules/cli-main-modules/detections/detectedProjectsMenu.js";
import {
  detectProject,
  detectProjectsWithReliverse,
} from "~/app/menu/create-project/cp-modules/cli-main-modules/detections/detectReliverseProjects.js";
import { relinka } from "~/app/menu/create-project/cp-modules/cli-main-modules/handlers/logger.js";
import { getCurrentWorkingDirectory } from "~/app/menu/create-project/cp-modules/cli-main-modules/handlers/terminal.js";
import {
  showEndPrompt,
  showStartPrompt,
} from "~/app/menu/create-project/cp-modules/cli-main-modules/modules/showStartEndPrompt.js";
import { readReliverseMemory } from "~/args/memory/impl.js";

import { showDevToolsMenu } from "../dev.js";
import {
  randomReliverseMenuTitle,
  randomWelcomeMessages,
} from "./db/messages.js";
import { buildBrandNewThing } from "./menu/menu-mod.js";

export async function app({
  isDev,
  config,
}: { isDev: boolean; config: ReliverseConfig }) {
  const cwd = getCurrentWorkingDirectory();

  await showStartPrompt({ dev: isDev });

  // In non-dev mode, check if there's a project in the root directory
  if (!isDev) {
    const rootProject = await detectProject(cwd);
    if (rootProject) {
      // If project exists in root, directly open its menu
      await showDetectedProjectsMenu([rootProject], isDev);
      await showEndPrompt();
      process.exit(0);
    }
  }

  relinka("info-verbose", "Detected project manager:", pm);

  // Check for .reliverse and project type
  let rules = await readReliverseConfig(cwd);
  const projectType = await detectProjectType(cwd);

  // If no rules file exists but we detected a project type, generate default rules
  if (!rules && projectType) {
    rules = await generateDefaultRulesForProject(cwd);
    if (rules) {
      await writeReliverseConfig(cwd, rules);
      relinka(
        "success",
        "Generated .reliverse based on detected project type. Please review it and adjust as needed.",
      );
    }
  }

  const options = await getMainMenuOptions(cwd, isDev);

  const memory = await readReliverseMemory();

  const choice = await selectPrompt({
    options,
    title: `🤖 ${
      memory.name && memory.name !== ""
        ? randomWelcomeMessages(memory.name)[
            Math.floor(
              Math.random() * randomWelcomeMessages(memory.name).length,
            )
          ]
        : ""
    } ${
      randomReliverseMenuTitle[
        Math.floor(Math.random() * randomReliverseMenuTitle.length)
      ]
    }`,
    titleColor: "retroGradient",
    displayInstructions: true,
  });

  if (choice === "create") {
    await buildBrandNewThing(isDev, config);
  } else if (choice === "detected-projects") {
    const searchPath = isDev ? path.join(cwd, "tests-runtime") : cwd;
    if (await fs.pathExists(searchPath)) {
      const detectedProjects = await detectProjectsWithReliverse(searchPath);
      await showDetectedProjectsMenu(detectedProjects, isDev);
    }
  } else if (choice === "isDevTools") {
    await showDevToolsMenu(config);
  }

  await showEndPrompt();
  process.exit(0);
}
