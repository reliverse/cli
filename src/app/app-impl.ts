import { pm, selectPrompt } from "@reliverse/prompts";
import fs from "fs-extra";
import path from "pathe";

import type { ReliverseMemory } from "~/types.js";

import { getMainMenuOptions } from "~/app/menu/create-project/cp-modules/cli-main-modules/cli-menu-items/getMainMenuOptions.js";
import { showDetectedProjectsMenu } from "~/app/menu/create-project/cp-modules/cli-main-modules/detections/detectedProjectsMenu.js";
import {
  showEndPrompt,
  showStartPrompt,
} from "~/app/menu/create-project/cp-modules/cli-main-modules/modules/showStartEndPrompt.js";
import { showDevToolsMenu } from "~/dev.js";
import { relinka } from "~/utils/loggerRelinka.js";
import {
  detectProject,
  detectProjectsWithReliverse,
  type ReliverseConfig,
} from "~/utils/reliverseConfig.js";

import {
  randomReliverseMenuTitle,
  randomWelcomeMessages,
} from "./db/messages.js";
import { buildBrandNewThing } from "./menu/menu-mod.js";

export async function app({
  cwd,
  isDev,
  memory,
  config,
}: {
  cwd: string;
  isDev: boolean;
  memory: ReliverseMemory;
  config: ReliverseConfig;
}) {
  await showStartPrompt(isDev);

  // In non-dev mode, check if there's a project in the root directory
  if (!isDev) {
    const rootProject = await detectProject(cwd);
    if (rootProject) {
      // If project exists in root, directly open its menu
      await showDetectedProjectsMenu([rootProject], isDev, memory, cwd);
      await showEndPrompt();
      return;
    }
  }

  relinka("info-verbose", "Detected project manager:", pm);

  const options = await getMainMenuOptions(cwd, isDev);

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
    await buildBrandNewThing(cwd, isDev, memory, config);
  } else if (choice === "detected-projects") {
    const searchPath = isDev ? path.join(cwd, "tests-runtime") : cwd;
    if (await fs.pathExists(searchPath)) {
      const detectedProjects = await detectProjectsWithReliverse(searchPath);
      await showDetectedProjectsMenu(detectedProjects, isDev, memory, cwd);
    }
  } else if (choice === "isDevTools") {
    await showDevToolsMenu(cwd, isDev, config, memory);
  }

  await showEndPrompt();
  process.exit(0);
}
