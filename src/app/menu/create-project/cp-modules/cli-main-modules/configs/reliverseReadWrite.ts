import type { TSConfig } from "pkg-types";
import type { PackageJson } from "pkg-types";

import { destr } from "destr";
import fs from "fs-extra";
import path from "pathe";
import { readTSConfig } from "pkg-types";
import { readPackageJSON } from "pkg-types";

import type { ReliverseConfig } from "~/types.js";

import { relinka } from "../handlers/logger.js";
import { getBiomeConfig } from "./miscellaneousConfigHelpers.js";

// Helper function to check if revalidation is needed
export function shouldRevalidate(
  lastRevalidate: string | undefined,
  frequency: string | undefined,
): boolean {
  if (!lastRevalidate || !frequency) {
    return true;
  }

  const now = new Date();
  const lastCheck = new Date(lastRevalidate);
  const diff = now.getTime() - lastCheck.getTime();

  switch (frequency) {
    case "1h":
      return diff > 60 * 60 * 1000;
    case "1d":
      return diff > 24 * 60 * 60 * 1000;
    case "2d":
      return diff > 2 * 24 * 60 * 60 * 1000;
    case "7d":
      return diff > 7 * 24 * 60 * 60 * 1000;
    default:
      return true;
  }
}

export async function writeReliverseConfig(
  targetDir: string,
  rules: ReliverseConfig,
): Promise<void> {
  try {
    const configPath = path.join(targetDir, ".reliverse");
    const config: ReliverseConfig = {
      experimental: {
        // Project details
        projectName: rules.experimental?.projectName ?? "unnamed-project",
        projectAuthor: rules.experimental?.projectAuthor ?? "anonymous",
        projectDescription: rules.experimental?.projectDescription ?? "",
        projectVersion: rules.experimental?.projectVersion ?? "1.0.0",
        projectLicense: rules.experimental?.projectLicense ?? "MIT",
        projectRepository: rules.experimental?.projectRepository ?? "",

        // Project features
        features: rules.experimental?.features ?? {
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
        projectFramework: rules.experimental?.projectFramework ?? "nextjs",
        projectPackageManager:
          rules.experimental?.projectPackageManager ?? "npm",
        projectFrameworkVersion: rules.experimental?.projectFrameworkVersion,
        nodeVersion: rules.experimental?.nodeVersion,
        runtime: rules.experimental?.runtime,
        monorepo: rules.experimental?.monorepo,
        preferredLibraries: rules.experimental?.preferredLibraries,
        codeStyle: rules.experimental?.codeStyle,

        // Dependencies management
        ignoreDependencies: rules.experimental?.ignoreDependencies ?? [],

        // Config revalidation
        configLastRevalidate:
          rules.experimental?.configLastRevalidate ?? new Date().toISOString(),
        configRevalidateFrequency:
          rules.experimental?.configRevalidateFrequency ?? "2d",

        // Custom rules
        customRules: rules.experimental?.customRules ?? {},

        // Generation preferences
        skipPromptsUseAutoBehavior:
          rules.experimental?.skipPromptsUseAutoBehavior ?? false,
        deployBehavior: rules.experimental?.deployBehavior ?? "prompt",
        depsBehavior: rules.experimental?.depsBehavior ?? "prompt",
        gitBehavior: rules.experimental?.gitBehavior ?? "prompt",
        i18nBehavior: rules.experimental?.i18nBehavior ?? "prompt",
        scriptsBehavior: rules.experimental?.scriptsBehavior ?? "prompt",
      },
    };

    // Types for comment sections
    type CommentSection = {
      title: string;
      fields: Partial<
        Record<keyof NonNullable<ReliverseConfig["experimental"]>, string[]>
      >;
    };

    type CommentSections = {
      experimental: CommentSection;
    };

    // Helper function to create comment
    const c = (text: string) => `// ${text}`;

    // Define comment sections with only essential comments
    const commentSections: CommentSections = {
      experimental: {
        title: c("Unstable features"),
        fields: {
          skipPromptsUseAutoBehavior: [
            c("Do you want autoYes/autoNo below?"),
            c("Set to true to activate auto-answering."),
            c("This is to ensure there is no unexpected behavior."),
          ],
          features: [c("Project capabilities")],
          projectFramework: [c("Tech stack of your project")],
          codeStyle: [c("Code style preferences")],
          ignoreDependencies: [c("Cleaner codemod will ignore these deps")],
          configLastRevalidate: [c("Config revalidation (1h | 1d | 2d | 7d)")],
          customRules: [c("Custom rules for Reliverse AI")],
          deployBehavior: [c("Prompts behavior (prompt | autoYes | autoNo)")],
        },
      },
    };

    // Format with 2 spaces indentation
    let content = JSON.stringify(config, null, 2);

    // Add section comments
    Object.entries(commentSections).forEach(([section, { title, fields }]) => {
      // Add section title with proper spacing
      content = content.replace(`"${section}":`, `${title}\n  "${section}":`);

      // Add field comments
      Object.entries(fields).forEach(([field, comments]) => {
        const fieldPattern = new RegExp(`(\\s+)"${field}":`, "g");
        // Add proper indentation for each comment line
        const formattedComments = comments
          .map(
            (comment, index, array) =>
              index === array.length - 1
                ? `    ${comment}` // Last comment
                : `    ${comment}\n`, // Other comments
          )
          .join("");
        content = content.replace(
          fieldPattern,
          `\n\n${formattedComments}\n    "${field}":`,
        );
      });
    });

    // Clean up multiple empty lines
    content = content
      .replace(/\n{3,}/g, "\n\n") // Replace 3 or more newlines with 2
      .replace(/{\n\n/g, "{\n") // Remove double newline after opening brace
      .replace(/\n\n}/g, "\n}"); // Remove double newline before closing brace

    await fs.writeFile(configPath, content);
    relinka("info-verbose", "Project configuration saved to .reliverse");
  } catch (error) {
    relinka(
      "error",
      "Error saving project configuration:",
      error instanceof Error ? error.message : String(error),
    );
  }
}

export async function readReliverseConfig(
  targetDir: string,
): Promise<ReliverseConfig | null> {
  try {
    const configPath = path.join(targetDir, ".reliverse");
    if (await fs.pathExists(configPath)) {
      const content = await fs.readFile(configPath, "utf-8");
      // Handle empty file or just {}
      if (!content.trim() || content.trim() === "{}") {
        const defaultRules = await getDefaultReliverseConfig(
          path.basename(targetDir),
          "user",
        );
        await writeReliverseConfig(targetDir, defaultRules);
        return defaultRules;
      }

      try {
        const config = destr(content);
        // Check if config object is empty
        if (!config || Object.keys(config).length === 0) {
          const defaultRules = await getDefaultReliverseConfig(
            path.basename(targetDir),
            "user",
          );
          await writeReliverseConfig(targetDir, defaultRules);
          return defaultRules;
        }
        // Validate config before returning
        if (
          !config ||
          typeof config !== "object" ||
          !("projectName" in config) ||
          !("projectAuthor" in config) ||
          !("projectFramework" in config) ||
          !("packageManager" in config)
        ) {
          const defaultRules = await getDefaultReliverseConfig(
            path.basename(targetDir),
            "user",
          );
          await writeReliverseConfig(targetDir, defaultRules);
          return defaultRules;
        }
        return config as ReliverseConfig;
      } catch (error) {
        relinka(
          "error",
          "Failed to parse .reliverse",
          error instanceof Error ? error.message : String(error),
        );
        return null;
      }
    }
  } catch (error) {
    relinka(
      "error-verbose",
      "Error reading project configuration:",
      error instanceof Error ? error.message : String(error),
    );
  }
  return null;
}

export async function getDefaultReliverseConfig(
  projectName: string,
  projectAuthor: string,
  projectFramework = "nextjs",
): Promise<ReliverseConfig> {
  const biomeConfig = await getBiomeConfig(process.cwd());

  // Read package.json and tsconfig.json
  let packageData: PackageJson = { name: projectName, author: projectAuthor };
  let tsConfig: TSConfig = {};

  try {
    packageData = await readPackageJSON();
  } catch {
    // Use default values if package.json doesn't exist
  }

  try {
    tsConfig = await readTSConfig();
  } catch {
    // Ignore error if tsconfig.json doesn't exist
  }

  return {
    experimental: {
      // Project details
      projectName: packageData.name ?? projectName,
      projectAuthor:
        typeof packageData.author === "object"
          ? (packageData.author.name ?? projectAuthor)
          : (packageData.author ?? projectAuthor),
      projectDescription: packageData.description ?? "",
      projectVersion: packageData.version ?? "1.0.0",
      projectLicense: packageData.license ?? "MIT",
      projectRepository:
        (typeof packageData.repository === "string"
          ? packageData.repository
          : packageData.repository?.url) ?? "",

      // Project features
      features: {
        i18n: true,
        analytics: false,
        themeMode: "dark-light",
        authentication: true,
        api: true,
        database: true,
        testing: false,
        docker: false,
        ci: false,
        commands: [],
        webview: [],
        language: [],
        themes: [],
      },

      // Development preferences
      projectFramework,
      projectPackageManager: "bun",
      preferredLibraries: {
        stateManagement: "zustand",
        formManagement: "react-hook-form",
        styling: "tailwind",
        uiComponents: "shadcn-ui",
        testing: "bun",
        authentication: "clerk",
        database: "drizzle",
        api: "trpc",
      },

      // Code style preferences
      codeStyle: {
        dontRemoveComments: true,
        shouldAddComments: true,
        typeOrInterface: (tsConfig as any).compilerOptions?.strict
          ? "type"
          : "interface",
        importOrRequire: "import",
        quoteMark: biomeConfig?.quoteMark ?? "double",
        semicolons: biomeConfig?.semicolons ?? true,
        lineWidth: biomeConfig?.lineWidth ?? 80,
        indentStyle: biomeConfig?.indentStyle ?? "space",
        indentSize: biomeConfig?.indentWidth ?? 2,
        importSymbol: "~",
        trailingComma: "all",
        bracketSpacing: true,
        arrowParens: "always",
        tabWidth: 2,
      },

      // Config revalidation
      configLastRevalidate: new Date().toISOString(),
      configRevalidateFrequency: "2d",

      // Generation preferences
      skipPromptsUseAutoBehavior: false,
      deployBehavior: "prompt",
      depsBehavior: "prompt",
      gitBehavior: "prompt",
      i18nBehavior: "prompt",
      scriptsBehavior: "prompt",
    },
  };
}
