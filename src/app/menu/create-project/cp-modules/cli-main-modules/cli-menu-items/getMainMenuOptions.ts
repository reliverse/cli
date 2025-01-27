import { re } from "@reliverse/relico";
import { isWindows, isBunPM } from "@reliverse/runtime";
import fs from "fs-extra";
import path from "pathe";

import type { ReliverseConfig } from "~/utils/schemaConfig.js";

import { detectProjectsWithReliverse } from "~/utils/reliverseConfig.js";

export type MainMenuChoice =
  | "create"
  | "clone"
  | "detected-projects"
  | "isDevTools"
  | "bun-windows"
  | "exit";

type MainMenuOption = {
  label: string;
  value: MainMenuChoice;
  hint?: string;
};

export async function getMainMenuOptions(
  cwd: string,
  isDev: boolean,
  reli: ReliverseConfig[],
): Promise<MainMenuOption[]> {
  // Note: The blank line issue is not in this file, but rather in the selectPrompt implementation
  // where deleteLastLine() is called before completePrompt()
  const multiConfigMsg =
    reli.length > 0
      ? re.dim(`multi-config mode with ${reli.length} projects`)
      : "";

  // 1) Start with the base options
  const options: MainMenuOption[] = [
    {
      label: re.bold("✨ Create a brand new project"),
      hint: multiConfigMsg,
      value: "create",
    },
    {
      label: re.bold("🧱 Clone an existing repo"),
      hint: multiConfigMsg,
      value: "clone",
    },
  ];

  // 2) Conditionally add the dev tools option
  if (isDev) {
    options.push({
      label: "🧰 Open developer tools",
      value: "isDevTools",
    });
  }

  // 3) Add bun-windows option if on Windows with Bun PM
  if (isWindows && isBunPM) {
    options.push({
      label: "🚀 Use Bun-native @reliverse/cli",
      value: "bun-windows",
      // hint: re.dim("Setup Bun runtime"),
    });
  }

  // 4) Always add the exit option
  options.push({
    label: "👈 Exit",
    value: "exit",
    hint: re.dim("ctrl+c anywhere"),
  });

  // 5) Detect .reliverse projects
  const dotReliverseSearchPath = isDev ? path.join(cwd, "tests-runtime") : cwd;

  if (await fs.pathExists(dotReliverseSearchPath)) {
    const detectedProjects = await detectProjectsWithReliverse(
      dotReliverseSearchPath,
    );
    if (detectedProjects.length > 0) {
      // Insert the "Edit project" item right after the first item
      options.splice(1, 0, {
        label: "📝 Edit project",
        value: "detected-projects",
        hint: re.dim(`Detected: ${detectedProjects.length}`),
      });
    }
  }

  return options;
}
