import { selectPrompt } from "@reliverse/prompts";
import { relinka } from "@reliverse/relinka";

import type { ReliverseMemory } from "~/types.js";

import { getMainMenuOptions } from "~/app/menu/create-project/cp-modules/cli-main-modules/cli-menu-items/getMainMenuOptions.js";
import {
  showOpenProjectMenu,
  handleOpenProjectMenu,
} from "~/app/menu/create-project/cp-modules/cli-main-modules/detections/detectedProjectsMenu.js";
import {
  showEndPrompt,
  showStartPrompt,
} from "~/app/menu/create-project/cp-modules/cli-main-modules/modules/showStartEndPrompt.js";
import { showDevToolsMenu } from "~/dev.js";
import {
  detectProject,
  type ReliverseConfig,
} from "~/utils/reliverseConfig.js";

import { getWelcomeTitle } from "./db/messages.js";
import { pm } from "./menu/create-project/cp-modules/cli-main-modules/detections/detectPackageManager.js";
import { showNewProjectMenu } from "./menu/menu-mod.js";

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
  relinka("info-verbose", "Detected project manager:", pm);
  const uiUsername = memory.name && memory.name !== "" ? memory.name : "";

  if (!isDev) {
    const rootProject = await detectProject(cwd);
    if (rootProject) {
      await handleOpenProjectMenu([rootProject], isDev, memory, cwd);
      await showEndPrompt();
      process.exit(0);
    }
  }

  const mainMenuOption = await selectPrompt({
    title: getWelcomeTitle(uiUsername),
    options: await getMainMenuOptions(cwd, isDev),
    titleColor: "retroGradient",
    displayInstructions: true,
  });

  if (mainMenuOption === "create") {
    await showNewProjectMenu(cwd, isDev, memory, config);
  } else if (mainMenuOption === "detected-projects") {
    await showOpenProjectMenu(cwd, isDev, memory);
  } else if (mainMenuOption === "isDevTools") {
    await showDevToolsMenu(cwd, isDev, config, memory);
  }

  await showEndPrompt();
  process.exit(0);
}
