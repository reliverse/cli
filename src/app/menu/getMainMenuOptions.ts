import fs from "fs-extra";
import path from "pathe";
import pc from "picocolors";

import { detectProjectsWithReliverse } from "~/utils/detectReliverseProjects.js";

export async function getMainMenuOptions(
  cwd: string,
  isDev = false,
): Promise<{ label: string; value: string; hint?: string }[]> {
  const options = [
    {
      label: pc.bold("✨ Create a brand new project"),
      value: "create",
    },
    {
      label: "👈 Exit",
      value: "exit",
      hint: pc.dim("ctrl+c anywhere"),
    },
  ];

  // Detect projects with .reliverse
  const searchPath = isDev ? path.join(cwd, "tests-runtime") : cwd;

  // Only detect projects if the directory exists
  if (await fs.pathExists(searchPath)) {
    const detectedProjects = await detectProjectsWithReliverse(searchPath);
    if (detectedProjects.length > 0) {
      options.splice(1, 0, {
        label: "📝 Edit project",
        value: "detected-projects",
        hint: pc.dim(`Detected: ${detectedProjects.length}`),
      });
    }
  }

  return options;
}
