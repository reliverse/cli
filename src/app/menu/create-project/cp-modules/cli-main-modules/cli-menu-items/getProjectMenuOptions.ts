import { relinka } from "@reliverse/prompts";
import { re } from "@reliverse/relico";
import fs from "fs-extra";

import { getReliverseConfigPath } from "~/utils/reliverseConfig.js";

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
    // Get the reliverse config path
    const { configPath } = await getReliverseConfigPath(cwd);
    const configExists = await fs.pathExists(configPath);
    if (configExists) {
      relinka("info-verbose", `Using existing config file: ${configPath}`);
    }
  } catch (error) {
    // Only show warning for non-initialization errors
    if (error instanceof Error && !error.message.includes("JSON Parse error")) {
      relinka(
        "warn",
        "Error processing config file. Using basic menu options.",
      );
      relinka(
        "warn-verbose",
        error instanceof Error ? error.message : String(error),
      );
    }
  }

  return options;
}
