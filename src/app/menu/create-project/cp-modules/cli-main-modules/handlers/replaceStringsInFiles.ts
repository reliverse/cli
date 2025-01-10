import fs from "fs-extra";
import path from "pathe";

import { relinka } from "~/app/menu/create-project/cp-modules/cli-main-modules/handlers/logger.js";

export async function replaceStringsInFiles(
  projectPath: string,
  oldValues: Record<string, string>,
): Promise<void> {
  // Validate inputs
  if (!projectPath || typeof projectPath !== "string") {
    throw new Error("Target directory is required and must be a string");
  }
  if (!oldValues || typeof oldValues !== "object") {
    throw new Error("oldValues must be a non-null object");
  }

  const fileExtensions = new Set([
    ".js",
    ".ts",
    ".json",
    ".md",
    ".mdx",
    ".html",
    ".jsx",
    ".tsx",
    ".css",
    ".scss",
    ".mjs",
    ".cjs",
  ]);

  const excludedDirs = new Set([
    "node_modules",
    ".git",
    "build",
    ".next",
    "dist",
    "dist-jsr",
    "dist-npm",
    "coverage",
  ]);

  const stringExclusions = new Set([
    "https://api.github.com/repos/blefnk/relivator",
  ]);

  function shouldProcessFile(filePath: string): boolean {
    const ext = path.extname(filePath).toLowerCase();
    return fileExtensions.has(ext);
  }

  function shouldSkipDirectory(dirName: string): boolean {
    return excludedDirs.has(dirName);
  }

  async function replaceInFile(filePath: string) {
    try {
      const fileContent = await fs.promises.readFile(filePath, "utf8");
      let newContent = fileContent;
      let hasChanges = false;

      for (const [key, value] of Object.entries(oldValues)) {
        if (!key || !value || stringExclusions.has(key)) continue;

        try {
          const regex = new RegExp(key, "g");
          const updatedContent = newContent.replace(regex, value);
          if (updatedContent !== newContent) {
            newContent = updatedContent;
            hasChanges = true;
          }
        } catch (regexError) {
          relinka(
            "error",
            `Invalid regex pattern for key: ${key}`,
            String(regexError),
          );
        }
      }

      if (hasChanges) {
        await fs.promises.writeFile(filePath, newContent, "utf8");
        relinka(
          "info-verbose",
          `Updated strings in ${path.relative(projectPath, filePath)}`,
        );
      }
    } catch (error) {
      relinka("error", `Error processing file ${filePath}:`, String(error));
    }
  }

  async function traverseDirectory(dir: string) {
    try {
      const files = await fs.promises.readdir(dir);

      await Promise.all(
        files.map(async (file) => {
          const fullPath = path.join(dir, file);
          const stat = await fs.promises.lstat(fullPath);

          if (stat.isDirectory()) {
            if (!shouldSkipDirectory(file)) {
              await traverseDirectory(fullPath);
            }
          } else if (shouldProcessFile(fullPath)) {
            await replaceInFile(fullPath);
          }
        }),
      );
    } catch (error) {
      relinka("error", `Error traversing directory ${dir}:`, String(error));
    }
  }

  try {
    const exists = await fs.pathExists(projectPath);
    if (!exists) {
      throw new Error(`Target directory does not exist: ${projectPath}`);
    }
    await traverseDirectory(projectPath);
  } catch (error) {
    relinka("error", "Failed to process directory:", String(error));
    throw error;
  }
}
