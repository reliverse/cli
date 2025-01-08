import fs from "fs-extra";
import path from "pathe";
import pc from "picocolors";

import { detectProjectsWithReliverse } from "~/app/menu/create-project/cp-modules/cli-main-modules/detections/detectReliverseProjects.js";

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
  isDev = false,
): Promise<MainMenuOption[]> {
  // 1) Start with the base options
  const options: MainMenuOption[] = [
    {
      label: pc.bold("✨ Create a brand new project"),
      value: "create",
    },
  ];

  // 2) Conditionally add the dev tools option
  if (isDev) {
    options.push({
      label: "🧰 Open developer tools",
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
        hint: pc.dim(`Detected: ${detectedProjects.length}`),
      });
    }
  }

  return options;
}
