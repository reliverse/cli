import fs from "fs-extra";
import path from "pathe";
import pc from "picocolors";

import type { ReliverseConfig } from "~/utils/reliverseSchema.js";

import { detectProjectsWithReliverse } from "~/utils/reliverseConfig.js";

export type MainMenuChoice =
  | "create"
  | "detected-projects"
  | "isDevTools"
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
  // 1) Start with the base options
  const options: MainMenuOption[] = [
    {
      label: pc.bold("✨ Create a brand new project"),
      value: "create",
      hint: reli.length > 0 ? pc.dim("multi-config mode") : "",
    },
  ];

  // 2) Conditionally add the dev tools option
  if (isDev) {
    options.push({
      label: "🧰 Open developer tools",
      hint:
        reli.length > 0 ? pc.dim(`detected ${reli.length} reli configs`) : "",
      value: "isDevTools",
    });
  }

  // 3) Always add the exit option
  options.push({
    label: "👈 Exit",
    value: "exit",
    hint: pc.dim("ctrl+c anywhere"),
  });

  // 4) Detect .reliverse projects
  const dotReliverseSearchPath = isDev ? path.join(cwd, "test-runtime") : cwd;

  if (await fs.pathExists(dotReliverseSearchPath)) {
    const detectedProjects = await detectProjectsWithReliverse(
      dotReliverseSearchPath,
    );
    if (detectedProjects.length > 0) {
      // Insert the "Edit project" item right after the first item
      options.splice(1, 0, {
        label: "📝 Edit project",
        value: "detected-projects",
        hint: pc.dim(`Detected: ${detectedProjects.length}`),
      });
    }
  }

  return options;
}
