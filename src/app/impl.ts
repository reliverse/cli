import { confirmPrompt, pm, selectPrompt } from "@reliverse/prompts";
import fs from "fs-extra";
import path from "pathe";

import type { ReliverseConfig } from "~/types.js";

import { readReliverseMemory } from "~/args/memory/impl.js";
import { generateDefaultRulesForProject } from "~/utils/configs/generateDefaultRulesForProject.js";
import { detectProjectType } from "~/utils/configs/miscellaneousConfigHelpers.js";
import {
  readReliverseConfig,
  writeReliverseConfig,
} from "~/utils/configs/reliverseReadWrite.js";
import { validateAndInsertMissingKeys } from "~/utils/configs/validateAndInsertMissingKeys.js";
import { relinka } from "~/utils/console.js";
import {
  detectProject,
  detectProjectsWithReliverse,
} from "~/utils/detectReliverseProjects.js";
import { getCurrentWorkingDirectory } from "~/utils/fs.js";

import {
  randomReliverseMenuTitle,
  randomWelcomeMessages,
} from "./db/messages.js";
import { buildBrandNewThing } from "./menu/buildBrandNewThing.js";
import { showDetectedProjectsMenu } from "./menu/detectedProjectsMenu.js";
import { getMainMenuOptions } from "./menu/getMainMenuOptions.js";
import { showEndPrompt, showStartPrompt } from "./menu/showStartEndPrompt.js";

export async function app({
  isDev,
  config,
}: { isDev: boolean; config: ReliverseConfig }) {
  const cwd = getCurrentWorkingDirectory();

  // Validate and insert missing keys in .reliverse if it exists
  await validateAndInsertMissingKeys(cwd);

  if (isDev) {
    const shouldAskToClear = false;
    if (shouldAskToClear) {
      const testsRuntimePath = path.join(cwd, "tests-runtime");
      if (await fs.pathExists(testsRuntimePath)) {
        const shouldRemoveTestsRuntime = await confirmPrompt({
          title: "[--dev] Do you want to clear the tests-runtime folder?",
        });
        if (shouldRemoveTestsRuntime) {
          await fs.remove(testsRuntimePath);
        }
      }
    }
  }

  await showStartPrompt();

  // In non-dev mode, check if there's a project in the root directory
  if (!isDev) {
    const rootProject = await detectProject(cwd);
    if (rootProject) {
      // If project exists in root, directly open its menu
      await showDetectedProjectsMenu([rootProject]);
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
    displayInstructions: true,
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
    options,
  });

  if (choice === "create") {
    await buildBrandNewThing(isDev, config);
  } else if (choice === "detected-projects") {
    const searchPath = isDev ? path.join(cwd, "tests-runtime") : cwd;
    if (await fs.pathExists(searchPath)) {
      const detectedProjects = await detectProjectsWithReliverse(searchPath);
      await showDetectedProjectsMenu(detectedProjects);
    }
  }

  await showEndPrompt();
  process.exit(0);
}
