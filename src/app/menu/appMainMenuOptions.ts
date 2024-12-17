import { destr } from "destr";
import fs from "fs-extra";
import path from "pathe";
import pc from "picocolors";

import type { ReliverseConfig } from "~/types.js";

import { generateDefaultRulesForProject } from "~/utils/configs/generateDefaultRulesForProject.js";
import {
  detectProjectType,
  detectConfigFiles,
} from "~/utils/configs/miscellaneousConfigHelpers.js";
import { parseCodeStyleFromConfigs } from "~/utils/configs/parseCodeStyleFromConfigs.js";
import {
  getDefaultReliverseConfig,
  writeReliverseConfig,
} from "~/utils/configs/reliverseReadWrite.js";
import { relinka } from "~/utils/console.js";

import { detectDatabaseProvider } from "./manageDrizzleSchemaUtils.js";

export async function getMainMenuOptions(
  cwd: string,
): Promise<{ label: string; value: string; hint?: string }[]> {
  const options = [
    {
      label: pc.bold("✨ Build a brand new thing"),
      value: "create",
    },
    {
      label: "👈 Exit",
      value: "exit",
      hint: pc.dim("ctrl+c anywhere"),
    },
  ];

  try {
    // Check if reliverse.json exists and has content
    const rulesPath = path.join(cwd, "reliverse.json");
    const rulesFileExists = await fs.pathExists(rulesPath);

    if (rulesFileExists) {
      // Check for config files only if reliverse.json exists
      const detectedConfigs = await detectConfigFiles(cwd);
      if (detectedConfigs.length > 0) {
        options.splice(1, 0, {
          label: "- Edit project config files",
          value: "edit-config",
          hint: `${detectedConfigs.length} config(s) detected`,
        });
      }

      // Add cleanup option only if reliverse.json exists
      options.splice(1, 0, {
        label: "- Cleanup project",
        value: "cleanup",
        hint: "Remove comments, unused dependencies",
      });

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

        // Integration and config options if rules exist
        options.splice(
          1,
          0,
          { label: "- Add integration", value: "add" },
          { label: "- Configure project", value: "config" },
        );

        // Drizzle option if configured
        if (mergedRules.preferredLibraries?.database === "drizzle") {
          const provider = await detectDatabaseProvider(cwd);
          const isDrizzleConfigured = provider !== null;
          const isSupportedProvider =
            provider === "postgres" ||
            provider === "sqlite" ||
            provider === "mysql";

          if (isDrizzleConfigured && isSupportedProvider) {
            options.splice(options.length - 1, 0, {
              label: "- Manage Drizzle schema",
              value: "drizzle-schema",
            });
          }
        }
      }
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
