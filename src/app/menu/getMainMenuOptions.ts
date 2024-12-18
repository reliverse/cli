import fs from "fs-extra";
import path from "pathe";
import pc from "picocolors";

import { relinka } from "~/utils/console.js";
import { detectProjectsWithReliverse } from "~/utils/detectReliverseProjects.js";

import { revalidateReliverseJson } from "./revalidateReliverseJson.js";

export async function getMainMenuOptions(
  cwd: string,
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

  // Detect projects with reliverse.json
  const detectedProjects = await detectProjectsWithReliverse(cwd);
  if (detectedProjects.length > 0) {
    options.splice(1, 0, {
      label: "📝 Edit project",
      value: "detected-projects",
      hint: pc.dim(`Detected: ${detectedProjects.length}`),
    });
  }

  try {
    // Check if reliverse.json exists and has content
    const rulesPath = path.join(cwd, "reliverse.json");
    const rulesFileExists = await fs.pathExists(rulesPath);

    if (rulesFileExists) {
      await revalidateReliverseJson(cwd, rulesPath);
    }
  } catch (error) {
    // Only show warning for non-initialization errors
    if (error instanceof Error && !error.message.includes("JSON Parse error")) {
      relinka(
        "warn",
        "Error processing reliverse.json file. Using basic menu options.",
      );
      relinka(
        "warn-verbose",
        error instanceof Error ? error.message : String(error),
      );
    }
  }

  return options;
}
