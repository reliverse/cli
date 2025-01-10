import { destr } from "destr";
import fs from "fs-extra";
import path from "pathe";

import type { ReliverseConfig } from "~/types.js";

import { relinka } from "~/app/menu/create-project/cp-modules/cli-main-modules/handlers/logger.js";

import { generateDefaultRulesForProject } from "../configs/generateDefaultRulesForProject.js";
import { detectProjectType } from "../configs/miscellaneousConfigHelpers.js";
import { parseCodeStyleFromConfigs } from "../configs/parseCodeStyleFromConfigs.js";
import {
  getDefaultReliverseConfig,
  writeReliverseConfig,
} from "../configs/reliverseReadWrite.js";

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
      experimental: {
        // Start with user's values
        ...parsedContent.experimental,

        // Only add defaults for missing fields
        projectName:
          parsedContent.experimental?.projectName ??
          defaultRules.experimental?.projectName ??
          "",
        projectAuthor:
          parsedContent.experimental?.projectAuthor ??
          defaultRules.experimental?.projectAuthor ??
          "",
        projectDescription:
          parsedContent.experimental?.projectDescription ??
          defaultRules.experimental?.projectDescription ??
          "",
        projectVersion:
          parsedContent.experimental?.projectVersion ??
          defaultRules.experimental?.projectVersion ??
          "0.1.0",
        projectLicense:
          parsedContent.experimental?.projectLicense ??
          defaultRules.experimental?.projectLicense ??
          "MIT",
        projectRepository:
          parsedContent.experimental?.projectRepository ??
          defaultRules.experimental?.projectRepository ??
          "",

        // Project features - only merge if missing
        features: {
          ...defaultRules.experimental?.features,
          ...parsedContent.experimental?.features,
        },

        // Development preferences - only set if missing
        projectFramework:
          parsedContent.experimental?.projectFramework ??
          defaultRules.experimental?.projectFramework,
        projectPackageManager:
          parsedContent.experimental?.projectPackageManager ??
          defaultRules.experimental?.projectPackageManager,
        projectFrameworkVersion:
          parsedContent.experimental?.projectFrameworkVersion ??
          defaultRules.experimental?.projectFrameworkVersion,
        nodeVersion:
          parsedContent.experimental?.nodeVersion ??
          defaultRules.experimental?.nodeVersion,
        runtime:
          parsedContent.experimental?.runtime ??
          defaultRules.experimental?.runtime,
        monorepo:
          parsedContent.experimental?.monorepo ??
          defaultRules.experimental?.monorepo,

        // Merge nested objects only if missing
        preferredLibraries: {
          ...defaultRules.experimental?.preferredLibraries,
          ...parsedContent.experimental?.preferredLibraries,
        },
        codeStyle: parsedContent.experimental?.codeStyle
          ? {
              ...defaultRules.experimental?.codeStyle,
              ...configRules?.experimental?.codeStyle,
              ...parsedContent.experimental?.codeStyle,
            }
          : undefined,

        // Generation preferences - only set if missing
        skipPromptsUseAutoBehavior:
          parsedContent.experimental?.skipPromptsUseAutoBehavior ??
          defaultRules.experimental?.skipPromptsUseAutoBehavior ??
          false,
        deployBehavior:
          parsedContent.experimental?.deployBehavior ??
          defaultRules.experimental?.deployBehavior ??
          "prompt",
        depsBehavior:
          parsedContent.experimental?.depsBehavior ??
          defaultRules.experimental?.depsBehavior ??
          "prompt",
        gitBehavior:
          parsedContent.experimental?.gitBehavior ??
          defaultRules.experimental?.gitBehavior ??
          "prompt",
        i18nBehavior:
          parsedContent.experimental?.i18nBehavior ??
          defaultRules.experimental?.i18nBehavior ??
          "prompt",
        scriptsBehavior:
          parsedContent.experimental?.scriptsBehavior ??
          defaultRules.experimental?.scriptsBehavior ??
          "prompt",

        // Dependencies management
        ignoreDependencies:
          parsedContent.experimental?.ignoreDependencies ??
          defaultRules.experimental?.ignoreDependencies,

        // Custom rules
        customRules: {
          ...defaultRules.experimental?.customRules,
          ...parsedContent.experimental?.customRules,
        },
      },
    };

    // Only write if there were missing fields or different values
    const currentContent = JSON.stringify(mergedRules);
    const originalContent = JSON.stringify(parsedContent);

    if (currentContent !== originalContent) {
      const hasNewFields = Object.keys(mergedRules.experimental ?? {}).some(
        (key) => {
          const mergedValue = JSON.stringify(
            mergedRules.experimental?.[
              key as keyof NonNullable<ReliverseConfig["experimental"]>
            ],
          );
          const parsedValue = JSON.stringify(
            parsedContent.experimental?.[
              key as keyof NonNullable<ReliverseConfig["experimental"]>
            ],
          );
          return mergedValue !== parsedValue;
        },
      );

      if (hasNewFields) {
        await writeReliverseConfig(cwd, mergedRules);
        relinka(
          "info",
          "Updated .reliverse with missing configurations. Please review and adjust as needed.",
        );
      }
    }
  }
}
