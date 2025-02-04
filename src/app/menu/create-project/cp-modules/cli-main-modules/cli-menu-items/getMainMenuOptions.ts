import { re } from "@reliverse/relico";
import { isBunPM, isBunRuntime } from "@reliverse/runtime";
import fs from "fs-extra";
import { homedir } from "node:os";
import path from "pathe";

import type { ReliverseConfig } from "~/utils/schemaConfig.js";

import { detectProjectsWithReliverse } from "~/utils/reliverseConfig.js";

export type MainMenuChoice =
  | "create"
  | "clone"
  | "detected-projects"
  | "isDevTools"
  | "native-cli"
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

  // 2) Inject the dev tools option
  options.push({
    label: "🧰 Open developer tools",
    value: "isDevTools",
  });

  // 3) Inject native-cli option if using Bun PM
  /**
   * The purpose of this system was to fix the fact that when `reliverse cli` was
   * installed using Bun - at least Windows was running the CLI in the Node.js process.
   *
   * However, Bun 1.2.2 has already fixed this. But this system still makes sense.
   * The CLI compiled in JS sometimes works with lags. So our brand new system allows users to run the
   * CLI directly using TypeScript. Thanks to this, the user will get the same experience as with `bun dev`.
   */
  // @ts-expect-error TODO: fix strictNullChecks undefined
  if (isBunPM && !isBunRuntime) {
    const isNativeInstalled = await fs.pathExists(
      path.join(homedir(), ".reliverse", "cli"),
    );

    let msg = "Use";
    if (isNativeInstalled && isBunRuntime) {
      msg = "Configure";
    }

    options.push({
      label: `🚀 ${msg} Bun-native @reliverse/cli`,
      value: "native-cli",
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
