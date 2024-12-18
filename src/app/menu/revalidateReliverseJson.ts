import { destr } from "destr";
import fs from "fs-extra";
import path from "pathe";

import type { ReliverseConfig } from "~/types.js";

import { generateDefaultRulesForProject } from "~/utils/configs/generateDefaultRulesForProject.js";
import { detectProjectType } from "~/utils/configs/miscellaneousConfigHelpers.js";
import { parseCodeStyleFromConfigs } from "~/utils/configs/parseCodeStyleFromConfigs.js";
import {
  getDefaultReliverseConfig,
  writeReliverseConfig,
} from "~/utils/configs/reliverseReadWrite.js";
import { relinka } from "~/utils/console.js";

export async function revalidateReliverseJson(cwd: string, rulesPath: string) {
  // Read file content and continue with the rest of the function...
  const fileContent = await fs.readFile(rulesPath, "utf-8");
  const parsedContent = fileContent.trim()
    ? destr<Partial<ReliverseConfig>>(fileContent)
    : {};

  // Get default rules based on project type
  const projectType = await detectProjectType(cwd);
  const defaultRules = projectType
    ? await generateDefaultRulesForProject(cwd)
    : await getDefaultReliverseConfig(
        path.basename(cwd),
        "user",
        "nextjs", // fallback default
      );

  if (defaultRules) {
    // Parse code style from existing config files
    const configRules = await parseCodeStyleFromConfigs(cwd);

    // Always merge with defaults to ensure all fields exist
    const mergedRules = {
      projectName: defaultRules.projectName,
      projectAuthor: defaultRules.projectAuthor,
      projectFramework: defaultRules.projectFramework,
      packageManager: defaultRules.projectPackageManager,
      ...parsedContent,
      features: {
        ...defaultRules.features,
        ...(parsedContent.features || {}),
      },
      preferredLibraries: {
        ...defaultRules.preferredLibraries,
        ...(parsedContent.preferredLibraries || {}),
      },
      codeStyle: {
        ...defaultRules.codeStyle,
        ...(configRules?.codeStyle || {}),
        ...(parsedContent.codeStyle || {}),
      },
    };

    // Only write if there were missing fields or different values
    if (JSON.stringify(mergedRules) !== JSON.stringify(parsedContent)) {
      const hasNewFields = !Object.keys(parsedContent).every(
        (key) =>
          JSON.stringify(mergedRules[key]) ===
          JSON.stringify(parsedContent[key]),
      );

      if (hasNewFields) {
        await writeReliverseConfig(cwd, mergedRules);
        relinka(
          "info",
          "Updated reliverse.json with missing configurations. Please review and adjust as needed.",
        );
      }
    }
  }
}
