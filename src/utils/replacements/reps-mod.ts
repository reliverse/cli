import { relinka } from "@reliverse/relinka";
import { destr } from "destr";
import fs from "fs-extra";
import { globby } from "globby";
import path from "pathe";

import type { ProjectConfigReturn } from "~/app/app-types.js";
import type { TemplateOption } from "~/utils/projectTemplate.js";
import type { ReliverseConfig } from "~/utils/schemaConfig.js";

import { extractRepoInfo, replaceStringsInFiles } from "./reps-impl.js";
import { CommonPatterns, HardcodedStrings } from "./reps-keys.js";

/**
 * Gets all package names from package.json dependencies
 */
async function getPackageNames(projectPath: string): Promise<string[]> {
  try {
    const pkgPath = path.join(projectPath, "package.json");
    if (!(await fs.pathExists(pkgPath))) return [];

    const pkg = await fs.readJson(pkgPath);
    const allDeps = {
      ...(pkg.dependencies || {}),
      ...(pkg.devDependencies || {}),
      ...(pkg.peerDependencies || {}),
    };

    return Object.keys(allDeps);
  } catch (error) {
    relinka("warn", "Failed to read package.json:", String(error));
    return [];
  }
}

/**
 * Gets all import paths from the project files
 */
async function getImportPaths(projectPath: string): Promise<string[]> {
  const importPaths = new Set<string>();

  try {
    // Find all JS/TS files
    const files = await globby("**/*.{js,ts,jsx,tsx}", {
      cwd: projectPath,
      ignore: ["node_modules/**", "dist/**", ".next/**", "build/**"],
    });

    // Extract import paths from each file
    for (const file of files) {
      const content = await fs.readFile(path.join(projectPath, file), "utf-8");

      // Match both static imports and dynamic imports
      const importMatches = [
        ...content.matchAll(/(?:import|from)\s+['"]([^'"]+)['"]/g),
        ...content.matchAll(/import\(['"]([^'"]+)['"]\)/g),
      ];

      for (const match of importMatches) {
        const importPath = match[1];
        if (importPath && !importPath.startsWith(".")) {
          // Only add package imports, not relative paths
          importPaths.add(importPath);
        }
      }
    }
  } catch (error) {
    relinka("warn", "Failed to gather import paths:", String(error));
  }

  return [...importPaths];
}

function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function capitalizeWithDashes(str: string): string {
  return str
    .split("-")
    .map((word) => capitalize(word))
    .join(" ");
}

export async function handleReplacements(
  projectPath: string,
  webProjectTemplate: TemplateOption,
  externalReliversePath: string,
  config: ProjectConfigReturn & { projectDescription?: string },
  existingRepo: boolean,
  showSuccessMessage: boolean,
) {
  relinka("info-verbose", "Personalizing texts in the initialized files...");

  // Gather package names and import paths to protect
  const [packageNames, importPaths] = await Promise.all([
    getPackageNames(projectPath),
    getImportPaths(projectPath),
  ]);

  // Try to read external .reliverse config if it exists and we're using an existing repo
  let externalConfig: ReliverseConfig | undefined;
  if (
    existingRepo &&
    externalReliversePath &&
    (await fs.pathExists(externalReliversePath))
  ) {
    try {
      const externalConfigContent = await fs.readFile(
        externalReliversePath,
        "utf-8",
      );
      const parsed = destr<ReliverseConfig>(externalConfigContent);
      if (parsed && typeof parsed === "object") {
        externalConfig = parsed;
        relinka(
          "info",
          "Found external .reliverse config from existing repo, will use its values for replacements",
        );
      }
    } catch (error) {
      relinka(
        "warn",
        "Failed to parse external .reliverse config:",
        String(error),
      );
    }
  }

  const { projectAuthor, projectName } = extractRepoInfo(webProjectTemplate);

  // Replacements map
  const replacementsMap: Record<string, string> = {
    // Domain replacements
    [HardcodedStrings.RelivatorDomain]: config.primaryDomain,
    [`${projectName}.com`]: config.primaryDomain,
    [`${projectName}.vercel.app`]: `${config.projectName}.vercel.app`,

    // Project name variations
    [projectName]: config.projectName,
    [HardcodedStrings.RelivatorShort]: config.projectName,
    [HardcodedStrings.RelivatorLower]: config.projectName.toLowerCase(),
    [HardcodedStrings.RelivatorShort.toLowerCase()]:
      config.projectName.toLowerCase(),
    [capitalize(HardcodedStrings.RelivatorShort)]: capitalizeWithDashes(
      config.projectName,
    ),

    // Author replacements
    [projectAuthor]: config.cliUsername,
    [HardcodedStrings.DefaultAuthor]: config.cliUsername,

    // URL patterns
    [CommonPatterns.githubUrl(projectAuthor, projectName)]:
      CommonPatterns.githubUrl(config.cliUsername, config.projectName),
    [CommonPatterns.githubUrl(
      HardcodedStrings.DefaultAuthor,
      HardcodedStrings.RelivatorLower,
    )]: CommonPatterns.githubUrl(config.cliUsername, config.projectName),

    // Package name patterns
    [CommonPatterns.packageName(projectName)]: CommonPatterns.packageName(
      config.projectName,
    ),
    [CommonPatterns.packageName(HardcodedStrings.RelivatorLower)]:
      CommonPatterns.packageName(config.projectName),

    // Title and description replacements
    [HardcodedStrings.RelivatorTitle]: config.projectDescription
      ? `${capitalizeWithDashes(config.projectName)} - ${config.projectDescription}`
      : `${capitalizeWithDashes(config.projectName)} - A modern web application for your business needs`,
    [HardcodedStrings.DefaultEmail]: config.cliUsername.includes("@")
      ? config.cliUsername
      : `${config.cliUsername}@${config.primaryDomain}`,
  };

  // Add replacements from external config if available
  if (externalConfig) {
    // Add any project-specific values from external config
    if (
      externalConfig.projectName &&
      externalConfig.projectName !== config.projectName
    ) {
      replacementsMap[externalConfig.projectName] = config.projectName;
      replacementsMap[externalConfig.projectName.toLowerCase()] =
        config.projectName.toLowerCase();
      replacementsMap[capitalize(externalConfig.projectName)] =
        capitalizeWithDashes(config.projectName);
    }
    if (
      externalConfig.projectAuthor &&
      externalConfig.projectAuthor !== config.cliUsername
    ) {
      replacementsMap[externalConfig.projectAuthor] = config.cliUsername;
    }
    if (externalConfig.projectDescription) {
      replacementsMap[externalConfig.projectDescription] =
        config.projectDescription ?? "";
    }
  }

  // Filter out empty or identical replacements
  const validReplacements = Object.fromEntries(
    Object.entries(replacementsMap).filter(
      ([key, value]) => key && value && key !== value && key.length > 1, // Avoid single-char replacements
    ),
  );

  try {
    await replaceStringsInFiles(projectPath, validReplacements, {
      verbose: true,
      // Both extensions and exact file names are supported
      fileExtensions: [
        ".js",
        ".ts",
        ".jsx",
        ".tsx", // JavaScript/TypeScript
        ".json",
        "package.json", // exact filename
        ".jsonc", // JSON files
        ".md",
        ".mdx", // Markdown
        ".html",
        ".css",
        ".scss", // Web files
        ".env",
        ".env.example", // Environment files
        "README.md", // exact filename
      ],
      excludedDirs: [
        "node_modules",
        ".git", // Standard excludes
        "build",
        ".next",
        "dist", // Build outputs
        "coverage",
        ".cache", // Test/cache dirs
        ".vercel",
        ".github", // CI/deployment
      ],
      stringExclusions: [
        "@types/", // Type packages
        /^(?:https?:\/\/)?[^\s/$.?#].[^\s]*\.[a-z]{2,}(?:\/[^\s]*)?$/i.source, // Protect all URLs
        ...packageNames, // Protect all package names from package.json
        ...importPaths, // Protect all import paths
      ],
      dryRun: false, // toggle to true for a safe "preview" run
      skipBinaryFiles: true, // skip images and other binary content
      maxConcurrency: 10, // limit concurrency
      stopOnError: false, // continue processing other files if one fails
    });
    if (showSuccessMessage) {
      relinka("success", "Successfully personalized project files...");
    }
  } catch (error) {
    relinka(
      "error",
      "❌ Failed to personalize project files:",
      error instanceof Error ? error.message : String(error),
    );
  }
}
