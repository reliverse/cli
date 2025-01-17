import { selectPrompt } from "@reliverse/prompts";
import { deleteLastLines } from "@reliverse/relinka";
import { generate } from "random-words";

import { getMainMenuOptions } from "~/app/menu/create-project/cp-modules/cli-main-modules/cli-menu-items/getMainMenuOptions.js";
import { handleOpenProjectMenu } from "~/app/menu/create-project/cp-modules/cli-main-modules/detections/detectedProjectsMenu.js";
import { showEndPrompt } from "~/app/menu/create-project/cp-modules/cli-main-modules/modules/showStartEndPrompt.js";
import { detectProject } from "~/utils/reliverseConfig.js";
import { renderEndLine } from "~/utils/terminalHelpers.js";

import type { ParamsOmitSkipPN } from "./app-types.js";

import { UNKNOWN_VALUE } from "./constants.js";
import { getRandomMessage, getWelcomeTitle } from "./db/messages.js";
import {
  showDevToolsMenu,
  showNewProjectMenu,
  showOpenProjectMenu,
} from "./menu/menu-mod.js";

export async function app(params: ParamsOmitSkipPN) {
  const { cwd, isDev, reli, memory, config } = params;

  const skipPrompts = config.skipPromptsUseAutoBehavior;
  const cliUsername = memory.name !== "" ? memory.name : UNKNOWN_VALUE;
  const projectName = isDev
    ? generate({ exactly: 2, join: "-" })
    : config.projectName;

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
    title: cliUsername
      ? getWelcomeTitle(cliUsername)
      : getRandomMessage("welcome"),
    options: await getMainMenuOptions(cwd, isDev, reli),
    titleColor: "retroGradient",
    displayInstructions: true,
  });

  if (mainMenuOption === "create") {
    await showNewProjectMenu({
      projectName,
      cwd,
      isDev,
      memory,
      config,
      reli,
      skipPrompts,
    });
  } else if (mainMenuOption === "detected-projects") {
    await showOpenProjectMenu({
      projectName,
      cwd,
      isDev,
      memory,
      config,
      reli,
      skipPrompts,
    });
  } else if (mainMenuOption === "isDevTools") {
    await showDevToolsMenu({
      projectName,
      cwd,
      isDev,
      config,
      memory,
      skipPrompts,
    });
  }

  await showEndPrompt();
  deleteLastLines(4);
  renderEndLine();
  process.exit(0);
}
