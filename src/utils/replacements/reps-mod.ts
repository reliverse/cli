import { relinka } from "@reliverse/prompts";
import { destr } from "destr";
import fs from "fs-extra";
import { globby } from "globby";
import path from "pathe";

import type { ProjectConfigReturn } from "~/app/app-types.js";
import type { RepoOption } from "~/utils/projectRepository.js";
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

/**
 * Gets the repository URL from package.json
 */
async function getRepositoryUrl(projectPath: string): Promise<string> {
  try {
    const pkgPath = path.join(projectPath, "package.json");
    if (!(await fs.pathExists(pkgPath))) return "";

    const pkg = await fs.readJson(pkgPath);

    // If repository field exists, use it
    if (pkg.repository) {
      if (typeof pkg.repository === "string") {
        // If it's a shorthand GitHub URL (user/repo), expand it
        if (!pkg.repository.includes("://")) {
          return `https://github.com/${pkg.repository}`;
        }
        return pkg.repository;
      }
      if (typeof pkg.repository === "object" && pkg.repository.url) {
        return pkg.repository.url;
      }
    }

    // If no repository field, try to construct from package name for scoped packages
    if (pkg.name?.startsWith("@")) {
      const [scope, name] = pkg.name.slice(1).split("/");
      return `https://github.com/${scope}/${name}`;
    }

    return "";
  } catch (error) {
    relinka("warn", "Failed to read package.json:", String(error));
    return "";
  }
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

/**
 * Creates case-sensitive variations of string replacements
 * @param oldValue - Original string to be replaced
 * @param newValue - New string to replace with
 * @returns Record of case-sensitive string replacements
 */
function createCaseVariations(
  oldValue: string,
  newValue: string,
): Record<string, string> {
  return {
    [oldValue.toLowerCase()]: newValue.toLowerCase(),
    [capitalize(oldValue)]: capitalize(newValue),
    [oldValue.toUpperCase()]: newValue.toUpperCase(),
    [capitalizeWithDashes(oldValue)]: capitalizeWithDashes(newValue),
  };
}

export async function handleReplacements(
  projectPath: string,
  selectedRepo: RepoOption,
  externalReliverseFilePath: string,
  config: ProjectConfigReturn & { projectDescription?: string },
  existingRepo: boolean,
  showSuccessMessage: boolean,
  isTemplateDownload: boolean,
) {
  const term = isTemplateDownload ? "template" : "repo";

  relinka("info-verbose", "Personalizing texts in the initialized files...");

  // Gather package names and import paths to protect
  const [packageNames, importPaths] = await Promise.all([
    getPackageNames(projectPath),
    getImportPaths(projectPath),
  ]);

  // Try to read external reliverse config (jsonc/ts)
  // if it exists and we're using an existing repo
  let externalConfig: ReliverseConfig | undefined;
  if (
    existingRepo &&
    externalReliverseFilePath &&
    (await fs.pathExists(externalReliverseFilePath))
  ) {
    try {
      const externalConfigContent = await fs.readFile(
        externalReliverseFilePath,
        "utf-8",
      );
      const parsed = destr<ReliverseConfig>(externalConfigContent);
      if (parsed && typeof parsed === "object") {
        externalConfig = parsed;
        relinka(
          "info",
          "Found external config from existing repo, will use its values for replacements",
        );
      }
    } catch (error) {
      relinka("warn", "Failed to parse external config:", String(error));
    }
  }

  const { inputRepoAuthor, inputRepoName } = extractRepoInfo(selectedRepo);

  let templateUrl = await getRepositoryUrl(projectPath);
  if (!templateUrl) {
    templateUrl = HardcodedStrings.RelivatorDomain;
  }

  const replacementsMap: Record<string, string> = {
    ...createCaseVariations(HardcodedStrings.GeneralTemplate, "project"),
    [HardcodedStrings.RelivatorDomain]: config.primaryDomain,
    [templateUrl]: config.primaryDomain,
    [`${inputRepoName}.vercel.app`]: `${config.projectName}.vercel.app`,
    ...createCaseVariations(inputRepoName, config.projectName),
    ...createCaseVariations(
      HardcodedStrings.RelivatorShort,
      config.projectName,
    ),
    ...createCaseVariations(inputRepoAuthor, config.frontendUsername),
    ...createCaseVariations(
      HardcodedStrings.DefaultAuthor,
      config.frontendUsername,
    ),
    [CommonPatterns.githubUrl(inputRepoAuthor, inputRepoName)]:
      CommonPatterns.githubUrl(config.frontendUsername, config.projectName),
    [CommonPatterns.githubUrl(
      HardcodedStrings.DefaultAuthor,
      HardcodedStrings.RelivatorLower,
    )]: CommonPatterns.githubUrl(config.frontendUsername, config.projectName),
    [CommonPatterns.packageName(inputRepoName)]: CommonPatterns.packageName(
      config.projectName,
    ),
    [CommonPatterns.packageName(HardcodedStrings.RelivatorLower)]:
      CommonPatterns.packageName(config.projectName),
    [HardcodedStrings.RelivatorTitle]: config.projectDescription
      ? `${capitalizeWithDashes(config.projectName)} - ${config.projectDescription}`
      : `${capitalizeWithDashes(config.projectName)} - A modern web application for your business needs`,
    [HardcodedStrings.DefaultEmail]: config.frontendUsername.includes("@")
      ? config.frontendUsername
      : `${config.frontendUsername}@${config.primaryDomain}`,
  };

  if (externalConfig) {
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
      externalConfig.projectAuthor !== config.frontendUsername
    ) {
      replacementsMap[externalConfig.projectAuthor] = config.frontendUsername;
    }
    if (externalConfig.projectDescription) {
      replacementsMap[externalConfig.projectDescription] =
        config.projectDescription ?? "";
    }
  }

  // Filter out empty or identical replacements
  const validReplacements = Object.fromEntries(
    Object.entries(replacementsMap).filter(
      ([key, value]) => key && value && key !== value && key.length > 1,
    ),
  );

  try {
    await replaceStringsInFiles(projectPath, validReplacements, {
      verbose: true,
      fileExtensions: [
        ".js",
        ".ts",
        ".jsx",
        ".tsx",
        ".json",
        "package.json",
        ".jsonc",
        ".md",
        ".mdx",
        ".html",
        ".css",
        ".scss",
        ".env",
        ".env.example",
        "README.md",
      ],
      excludedDirs: [
        "node_modules",
        ".git",
        "build",
        ".next",
        "dist",
        "coverage",
        ".cache",
        ".vercel",
        ".github",
      ],
      stringExclusions: [
        "@types/",
        /^(?:https?:\/\/)?[^\s/$.?#].[^\s]*\.[a-z]{2,}(?:\/[^\s]*)?$/i.source,
        ...packageNames,
        ...importPaths,
      ],
      dryRun: false,
      skipBinaryFiles: true,
      maxConcurrency: 10,
      stopOnError: false,
    });
    if (showSuccessMessage) {
      relinka("success", `Successfully personalized ${term} files!`);
    }
  } catch (error) {
    relinka(
      "error",
      `❌ Failed to personalize ${term} files:`,
      error instanceof Error ? error.message : String(error),
    );
  }
}
