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
    const mergedRules: ReliverseConfig = {
      experimental: {
        // Project details
        projectName: defaultRules.experimental?.projectName,
        projectAuthor: defaultRules.experimental?.projectAuthor,
        projectFramework: defaultRules.experimental?.projectFramework,
        projectPackageManager: defaultRules.experimental?.projectPackageManager,

        // Project features
        features: defaultRules.experimental?.features
          ? {
              i18n: defaultRules.experimental.features.i18n ?? false,
              analytics: defaultRules.experimental.features.analytics ?? false,
              themeMode:
                defaultRules.experimental.features.themeMode ?? "light",
              authentication:
                defaultRules.experimental.features.authentication ?? false,
              api: defaultRules.experimental.features.api ?? false,
              database: defaultRules.experimental.features.database ?? false,
              testing: defaultRules.experimental.features.testing ?? false,
              docker: defaultRules.experimental.features.docker ?? false,
              ci: defaultRules.experimental.features.ci ?? false,
              commands: defaultRules.experimental.features.commands ?? [],
              webview: defaultRules.experimental.features.webview ?? [],
              language: defaultRules.experimental.features.language ?? [],
              themes: defaultRules.experimental.features.themes ?? [],
              ...parsedContent.experimental?.features,
            }
          : undefined,

        // Development preferences
        preferredLibraries: defaultRules.experimental?.preferredLibraries
          ? {
              ...defaultRules.experimental.preferredLibraries,
              ...parsedContent.experimental?.preferredLibraries,
            }
          : undefined,

        // Code style preferences
        codeStyle: defaultRules.experimental?.codeStyle
          ? {
              lineWidth: defaultRules.experimental.codeStyle.lineWidth ?? 80,
              cjsToEsm: defaultRules.experimental.codeStyle.cjsToEsm ?? true,
              importSymbol:
                defaultRules.experimental.codeStyle.importSymbol ?? "import",
              indentSize: defaultRules.experimental.codeStyle.indentSize ?? 2,
              indentStyle:
                defaultRules.experimental.codeStyle.indentStyle ?? "space",
              dontRemoveComments:
                defaultRules.experimental.codeStyle.dontRemoveComments ?? false,
              shouldAddComments:
                defaultRules.experimental.codeStyle.shouldAddComments ?? true,
              typeOrInterface:
                defaultRules.experimental.codeStyle.typeOrInterface ?? "type",
              importOrRequire:
                defaultRules.experimental.codeStyle.importOrRequire ?? "import",
              quoteMark:
                defaultRules.experimental.codeStyle.quoteMark ?? "double",
              semicolons:
                defaultRules.experimental.codeStyle.semicolons ?? true,
              trailingComma:
                defaultRules.experimental.codeStyle.trailingComma ?? "all",
              bracketSpacing:
                defaultRules.experimental.codeStyle.bracketSpacing ?? true,
              arrowParens:
                defaultRules.experimental.codeStyle.arrowParens ?? "always",
              tabWidth: defaultRules.experimental.codeStyle.tabWidth ?? 2,
              jsToTs: defaultRules.experimental.codeStyle.jsToTs ?? false,
              modernize: defaultRules.experimental.codeStyle.modernize
                ? {
                    replaceFs:
                      defaultRules.experimental.codeStyle.modernize.replaceFs ??
                      true,
                    replacePath:
                      defaultRules.experimental.codeStyle.modernize
                        .replacePath ?? true,
                    replaceHttp:
                      defaultRules.experimental.codeStyle.modernize
                        .replaceHttp ?? true,
                    replaceProcess:
                      defaultRules.experimental.codeStyle.modernize
                        .replaceProcess ?? true,
                    replaceConsole:
                      defaultRules.experimental.codeStyle.modernize
                        .replaceConsole ?? true,
                    replaceEvents:
                      defaultRules.experimental.codeStyle.modernize
                        .replaceEvents ?? true,
                  }
                : undefined,
              ...configRules?.experimental?.codeStyle,
              ...parsedContent.experimental?.codeStyle,
            }
          : undefined,

        // Generation preferences
        skipPromptsUseAutoBehavior:
          defaultRules.experimental?.skipPromptsUseAutoBehavior ?? false,
        deployBehavior: defaultRules.experimental?.deployBehavior ?? "prompt",
        depsBehavior: defaultRules.experimental?.depsBehavior ?? "prompt",
        gitBehavior: defaultRules.experimental?.gitBehavior ?? "prompt",
        i18nBehavior: defaultRules.experimental?.i18nBehavior ?? "prompt",
        scriptsBehavior: defaultRules.experimental?.scriptsBehavior ?? "prompt",

        // Config revalidation
        configLastRevalidate: defaultRules.experimental?.configLastRevalidate,
        configRevalidateFrequency:
          defaultRules.experimental?.configRevalidateFrequency,

        // Dependencies management
        ignoreDependencies: defaultRules.experimental?.ignoreDependencies,

        // Custom rules
        customRules: defaultRules.experimental?.customRules,

        ...parsedContent.experimental,
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
