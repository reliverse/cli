import { selectPrompt } from "@reliverse/prompts";
import { deleteLastLines, relinka } from "@reliverse/relinka";

import type { ReliverseConfig } from "~/utils/schemaConfig.js";
import type { ReliverseMemory } from "~/utils/schemaMemory.js";

import { getMainMenuOptions } from "~/app/menu/create-project/cp-modules/cli-main-modules/cli-menu-items/getMainMenuOptions.js";
import {
  showOpenProjectMenu,
  handleOpenProjectMenu,
} from "~/app/menu/create-project/cp-modules/cli-main-modules/detections/detectedProjectsMenu.js";
import { showEndPrompt } from "~/app/menu/create-project/cp-modules/cli-main-modules/modules/showStartEndPrompt.js";
import { showDevToolsMenu } from "~/dev.js";
import { detectProject } from "~/utils/reliverseConfig.js";
import { renderEndLine } from "~/utils/terminalHelpers.js";

import { getWelcomeTitle } from "./db/messages.js";
import { pm } from "./menu/create-project/cp-modules/cli-main-modules/detections/detectPackageManager.js";
import { showNewProjectMenu } from "./menu/menu-mod.js";

export async function app({
  cwd,
  isDev,
  memory,
  config,
  reli,
}: {
  cwd: string;
  isDev: boolean;
  memory: ReliverseMemory;
  config: ReliverseConfig;
  reli: ReliverseConfig[];
}) {
  // await showStartPrompt(isDev);
  relinka("info-verbose", "Detected project manager:", pm);
  const uiUsername = memory.name && memory.name !== "" ? memory.name : "";

  if (!isDev) {
    const rootProject = await detectProject(cwd);
    if (rootProject) {
      await handleOpenProjectMenu(
        [rootProject],
        isDev,
        memory,
        cwd,
        true,
        config,
      );
      await showEndPrompt();
      deleteLastLines(4);
      renderEndLine();
      process.exit(0);
    }
  }

  const mainMenuOption = await selectPrompt({
    title: getWelcomeTitle(uiUsername),
    options: await getMainMenuOptions(cwd, isDev, reli),
    titleColor: "retroGradient",
    displayInstructions: true,
  });

  if (mainMenuOption === "create") {
    await showNewProjectMenu(cwd, isDev, memory, config, reli);
  } else if (mainMenuOption === "detected-projects") {
    await showOpenProjectMenu(cwd, isDev, memory, config, reli);
  } else if (mainMenuOption === "isDevTools") {
    await showDevToolsMenu(cwd, isDev, config, memory);
  }

  await showEndPrompt();
  deleteLastLines(4);
  renderEndLine();
  process.exit(0);
}
