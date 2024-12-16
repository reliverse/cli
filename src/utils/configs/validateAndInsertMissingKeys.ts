import { destr } from "destr";
import fs from "fs-extra";
import path from "pathe";

import type { ReliverseConfig } from "~/types.js";

import { relinka } from "../console.js";
import { generateDefaultRulesForProject } from "./generateDefaultRulesForProject.js";
import { detectProjectType } from "./miscellaneousConfigHelpers.js";
import { parseCodeStyleFromConfigs } from "./parseCodeStyleFromConfigs.js";
import { DEFAULT_CONFIG } from "./reliverseDefaultConfig.js";
import {
  getDefaultReliverseConfig,
  shouldRevalidate,
} from "./reliverseReadWrite.js";

export async function validateAndInsertMissingKeys(cwd: string): Promise<void> {
  try {
    const configPath = path.join(cwd, "reliverse.json");

    // Check if reliverse.json exists
    if (!(await fs.pathExists(configPath))) {
      return;
    }

    // Read current config
    const content = await fs.readFile(configPath, "utf-8");
    let parsedContent;

    try {
      parsedContent = destr(content);
    } catch {
      relinka("error", "Failed to parse reliverse.json");
      return;
    }

    if (!parsedContent || typeof parsedContent !== "object") {
      return;
    }

    // Check if we need to revalidate based on frequency
    if (
      !shouldRevalidate(
        parsedContent.configLastRevalidate,
        parsedContent.configRevalidateFrequency,
      )
    ) {
      return;
    }

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
      const mergedConfig: ReliverseConfig = {
        ...DEFAULT_CONFIG,
        ...parsedContent,
        // Project details
        projectName: defaultRules.projectName,
        projectAuthor: defaultRules.projectAuthor,
        projectDescription:
          defaultRules.projectDescription || parsedContent.projectDescription,
        projectVersion:
          defaultRules.projectVersion || parsedContent.projectVersion,
        projectLicense:
          defaultRules.projectLicense || parsedContent.projectLicense,
        projectRepository:
          defaultRules.projectRepository || parsedContent.projectRepository,

        // Project features
        features: {
          ...defaultRules.features,
          ...(parsedContent.features || {}),
        },

        // Development preferences
        projectFramework: defaultRules.projectFramework,
        projectPackageManager: defaultRules.projectPackageManager,
        projectFrameworkVersion:
          defaultRules.projectFrameworkVersion ||
          parsedContent.projectFrameworkVersion,
        nodeVersion: defaultRules.nodeVersion || parsedContent.nodeVersion,
        runtime: defaultRules.runtime || parsedContent.runtime,
        monorepo: defaultRules.monorepo || parsedContent.monorepo,
        preferredLibraries: {
          ...defaultRules.preferredLibraries,
          ...(parsedContent.preferredLibraries || {}),
        },
        codeStyle: {
          ...defaultRules.codeStyle,
          ...(configRules?.codeStyle || {}),
          ...(parsedContent.codeStyle || {}),
        },

        // Dependencies management
        ignoreDependencies:
          parsedContent.ignoreDependencies || defaultRules.ignoreDependencies,

        // Config revalidation
        configLastRevalidate: new Date().toISOString(),
        configRevalidateFrequency:
          parsedContent.configRevalidateFrequency || "2d",

        // Custom rules
        customRules: {
          ...(defaultRules.customRules || {}),
          ...(parsedContent.customRules || {}),
        },
      };

      // Only write if there were missing fields or different values
      if (JSON.stringify(mergedConfig) !== JSON.stringify(parsedContent)) {
        const hasNewFields = !Object.keys(parsedContent).every(
          (key) =>
            JSON.stringify(mergedConfig[key]) ===
            JSON.stringify(parsedContent[key]),
        );

        if (hasNewFields) {
          await fs.writeFile(configPath, JSON.stringify(mergedConfig, null, 2));
          relinka(
            "info",
            "Updated reliverse.json with missing configurations. Please review and adjust as needed.",
          );
        }
      }
    }
  } catch (error) {
    relinka(
      "error-verbose",
      "Error validating reliverse.json:",
      error instanceof Error ? error.message : String(error),
    );
  }
}
