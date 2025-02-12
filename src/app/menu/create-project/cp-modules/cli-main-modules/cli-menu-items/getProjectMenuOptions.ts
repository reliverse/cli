import { relinka } from "@reliverse/prompts";
import { re } from "@reliverse/relico";
import fs from "fs-extra";

import { getReliverseConfigPath } from "~/app/constants.js";

export async function getProjectMenuOptions(
  cwd: string,
): Promise<{ label: string; value: string; hint?: string }[]> {
  const options = [
    {
      label: "👈 Exit",
      value: "exit",
      hint: re.dim("ctrl+c anywhere"),
    },
  ];

  try {
    // Check if reliverse.jsonc file exists and has content
    const rulesPath = getReliverseConfigPath(cwd);
    const rulesFileExists = await fs.pathExists(rulesPath);

    if (rulesFileExists) {
      relinka("info-verbose", "Using existing reliverse.jsonc file");
    }
  } catch (error) {
    // Only show warning for non-initialization errors
    if (error instanceof Error && !error.message.includes("JSON Parse error")) {
      relinka(
        "warn",
        "Error processing reliverse.jsonc file. Using basic menu options.",
      );
      relinka(
        "warn-verbose",
        error instanceof Error ? error.message : String(error),
      );
    }
  }

  return options;
}
