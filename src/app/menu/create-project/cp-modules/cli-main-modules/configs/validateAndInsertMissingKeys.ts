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
          projectName: defaultRules.experimental?.projectName ?? "",
          projectAuthor: defaultRules.experimental?.projectAuthor ?? "",
          projectDescription:
            defaultRules.experimental?.projectDescription ??
            parsedContent.experimental?.projectDescription ??
            "",
          projectVersion:
            defaultRules.experimental?.projectVersion ??
            parsedContent.experimental?.projectVersion ??
            "1.0.0",
          projectLicense:
            defaultRules.experimental?.projectLicense ??
            parsedContent.experimental?.projectLicense ??
            "MIT",
          projectRepository:
            defaultRules.experimental?.projectRepository ??
            parsedContent.experimental?.projectRepository ??
            "",

          // Project features
          features: defaultRules.experimental?.features ?? {
            i18n: false,
            analytics: false,
            themeMode: "light",
            authentication: false,
            api: false,
            database: false,
            testing: false,
            docker: false,
            ci: false,
            commands: [],
            webview: [],
            language: [],
            themes: [],
          },

          // Development preferences
          projectFramework: defaultRules.experimental?.projectFramework,
          projectPackageManager:
            defaultRules.experimental?.projectPackageManager,
          projectFrameworkVersion:
            defaultRules.experimental?.projectFrameworkVersion ??
            parsedContent.experimental?.projectFrameworkVersion,
          nodeVersion:
            defaultRules.experimental?.nodeVersion ??
            parsedContent.experimental?.nodeVersion,
          runtime:
            defaultRules.experimental?.runtime ??
            parsedContent.experimental?.runtime,
          monorepo:
            defaultRules.experimental?.monorepo ??
            parsedContent.experimental?.monorepo,
          preferredLibraries: {
            ...defaultRules.experimental?.preferredLibraries,
            ...parsedContent.experimental?.preferredLibraries,
          },
          codeStyle: defaultRules.experimental?.codeStyle,

          // Dependencies management
          ignoreDependencies:
            parsedContent.experimental?.ignoreDependencies ??
            defaultRules.experimental?.ignoreDependencies,

          // Config revalidation
          configLastRevalidate: new Date().toISOString(),
          configRevalidateFrequency:
            parsedContent.experimental?.configRevalidateFrequency ?? "2d",

          // Custom rules
          customRules: {
            ...defaultRules.experimental?.customRules,
            ...parsedContent.experimental?.customRules,
          },

          // Generation preferences
          skipPromptsUseAutoBehavior:
            defaultRules.experimental?.skipPromptsUseAutoBehavior ?? false,
          deployBehavior: defaultRules.experimental?.deployBehavior ?? "prompt",
          depsBehavior: defaultRules.experimental?.depsBehavior ?? "prompt",
          gitBehavior: defaultRules.experimental?.gitBehavior ?? "prompt",
          i18nBehavior: defaultRules.experimental?.i18nBehavior ?? "prompt",
          scriptsBehavior:
            defaultRules.experimental?.scriptsBehavior ?? "prompt",
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
