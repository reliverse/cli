import { parseJSONC } from "confbox";
import { destr } from "destr";
import fs from "fs-extra";
import path from "pathe";

import type { DetectedProject, ReliverseConfig } from "~/types.js";

import { relinka } from "./console.js";

export async function detectProjectsWithReliverse(
  cwd: string,
): Promise<DetectedProject[]> {
  const detectedProjects: DetectedProject[] = [];

  const items = await fs.readdir(cwd, { withFileTypes: true });
  for (const item of items) {
    if (item.isDirectory()) {
      const projectPath = path.join(cwd, item.name);
      const reliversePath = path.join(projectPath, "reliverse.json");

      if (await fs.pathExists(reliversePath)) {
        try {
          const configContent = await fs.readFile(reliversePath, "utf-8");
          const parsedConfig = parseJSONC(configContent);
          const config = destr<ReliverseConfig>(parsedConfig);

          detectedProjects.push({
            name: item.name,
            path: projectPath,
            config,
          });
        } catch (error) {
          relinka(
            "warn",
            `Error processing ${item.name}: ${error instanceof Error ? error.message : String(error)}`,
          );
        }
      }
    }
  }

  return detectedProjects;
}
