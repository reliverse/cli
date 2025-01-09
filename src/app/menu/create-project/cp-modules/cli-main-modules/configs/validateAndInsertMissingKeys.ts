import { destr } from "destr";
import fs from "fs-extra";
import path from "pathe";

import type { ReliverseConfig } from "~/types.js";

import { relinka } from "../handlers/logger.js";
import { generateDefaultRulesForProject } from "./generateDefaultRulesForProject.js";
import { detectProjectType } from "./miscellaneousConfigHelpers.js";
import {
  getDefaultReliverseConfig,
  shouldRevalidate,
} from "./reliverseReadWrite.js";

export async function validateAndInsertMissingKeys(cwd: string): Promise<void> {
  try {
    const configPath = path.join(cwd, ".reliverse");

    // Check if .reliverse exists
    if (!(await fs.pathExists(configPath))) {
      return;
    }

    // Read current config
    const content = await fs.readFile(configPath, "utf-8");
    let parsedContent;

    try {
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
      parsedContent = destr(content) as Partial<ReliverseConfig>;
    } catch {
      relinka("error", "Failed to parse .reliverse");
      return;
    }

    if (!parsedContent || typeof parsedContent !== "object") {
      return;
    }

    // Check if we need to revalidate based on frequency
    if (
      !shouldRevalidate(
        parsedContent.experimental?.configLastRevalidate,
        parsedContent.experimental?.configRevalidateFrequency,
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
      // Always merge with defaults to ensure all fields exist
      const mergedConfig: ReliverseConfig = {
        experimental: {
          // Project details
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

          // Project features
          features: {
            ...defaultRules.experimental?.features,
            ...parsedContent.experimental?.features,
          },

          // Development preferences
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
          preferredLibraries: {
            ...defaultRules.experimental?.preferredLibraries,
            ...parsedContent.experimental?.preferredLibraries,
          },
          codeStyle: {
            ...defaultRules.experimental?.codeStyle,
            ...parsedContent.experimental?.codeStyle,
          },

          // Dependencies management
          ignoreDependencies:
            parsedContent.experimental?.ignoreDependencies ??
            defaultRules.experimental?.ignoreDependencies,

          // Config revalidation
          configLastRevalidate: shouldRevalidate(
            parsedContent.experimental?.configLastRevalidate,
            parsedContent.experimental?.configRevalidateFrequency,
          )
            ? new Date().toISOString()
            : parsedContent.experimental?.configLastRevalidate,
          configRevalidateFrequency:
            parsedContent.experimental?.configRevalidateFrequency ?? "7d",

          // Custom rules
          customRules: {
            ...defaultRules.experimental?.customRules,
            ...parsedContent.experimental?.customRules,
          },

          // Generation preferences
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
        },
      };

      // Only write if there were missing fields or different values
      if (JSON.stringify(mergedConfig) !== JSON.stringify(parsedContent)) {
        const hasNewFields = !Object.keys(parsedContent).every(
          (key) =>
            JSON.stringify(mergedConfig[key as keyof ReliverseConfig]) ===
            JSON.stringify(parsedContent[key as keyof ReliverseConfig]),
        );

        if (hasNewFields) {
          await fs.writeFile(configPath, JSON.stringify(mergedConfig, null, 2));
          relinka(
            "info",
            "Updated .reliverse with missing configurations. Please review and adjust as needed.",
          );
        }
      }
    }
  } catch (error) {
    relinka(
      "error-verbose",
      "Error validating .reliverse:",
      error instanceof Error ? error.message : String(error),
    );
  }
}
