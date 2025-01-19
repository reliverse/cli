import { relinka } from "@reliverse/relinka";

import type { ProjectConfigReturn } from "~/app/app-types.js";
import type { TemplateOption } from "~/utils/projectTemplate.js";

import { extractRepoInfo, replaceStringsInFiles } from "./reps-impl.js";
import { CommonPatterns, HardcodedStrings } from "./reps-keys.js";

export async function replaceTemplateStrings(
  projectPath: string,
  webProjectTemplate: TemplateOption,
  config: ProjectConfigReturn,
) {
  relinka("info-verbose", "Personalizing texts in the initialized files...");

  const { projectAuthor, projectName } = extractRepoInfo(webProjectTemplate);

  // Replacements map
  const replacements: Record<string, string> = {
    // Domain replacements
    [HardcodedStrings.RelivatorDomain]: config.primaryDomain,
    [`${projectName}.com`]: config.primaryDomain,
    [`${projectName}.vercel.app`]: `${config.projectName}.vercel.app`,

    // Project name variations
    [projectName]: config.projectName,
    [HardcodedStrings.RelivatorShort]: config.projectName,
    [HardcodedStrings.RelivatorLower]: config.projectName.toLowerCase(),

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
    [HardcodedStrings.RelivatorTitle]: `${config.projectName} – Your Modern Web Application`,
    [HardcodedStrings.DefaultEmail]: config.cliUsername.includes("@")
      ? config.cliUsername
      : `${config.cliUsername}@${config.primaryDomain}`,
  };

  // Filter out empty or identical replacements
  const validReplacements = Object.fromEntries(
    Object.entries(replacements).filter(
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
        "https://api.github.com", // API URLs
        "https://github.com/features", // GitHub feature pages
        "@types/", // Type packages
      ],
      dryRun: false, // toggle to true for a safe "preview" run
      skipBinaryFiles: true, // skip images and other binary content
      maxConcurrency: 10, // limit concurrency
      stopOnError: false, // continue processing other files if one fails
    });
    relinka("success", "Successfully personalized project files...");
  } catch (error) {
    relinka(
      "error",
      "❌ Failed to personalize project files:",
      error instanceof Error ? error.message : String(error),
    );
  }
}
