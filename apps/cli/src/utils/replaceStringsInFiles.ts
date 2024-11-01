import { consola } from "consola";
import fs from "fs-extra";
import path from "pathe";

import { DEBUG } from "~/app";

export async function replaceStringsInFiles(
  targetDir: string,
  oldValues: Record<string, string>,
): Promise<void> {
  const fileExtensions = [
    ".js",
    ".ts",
    ".json",
    ".md",
    ".html",
    ".jsx",
    ".tsx",
  ];

  function shouldReplaceInFile(filename: string): boolean {
    return fileExtensions.some((ext) => filename.endsWith(ext));
  }

  async function replaceInFile(filePath: string) {
    const fileContent = await fs.promises.readFile(filePath, "utf8");

    let newContent = fileContent;

    for (const key of Object.keys(oldValues)) {
      const value = oldValues[key];

      if (value !== undefined) {
        // Ensure value is not undefined
        const regex = new RegExp(key, "g"); // Replace all occurrences

        newContent = newContent.replace(regex, value);
      }
    }

    if (newContent !== fileContent) {
      await fs.promises.writeFile(filePath, newContent, "utf8");
      DEBUG.enableVerboseLogging &&
        consola.info(`Replaced strings in ${filePath}`);
    }
  }

  async function traverseDirectory(dir: string) {
    const files = await fs.promises.readdir(dir);

    for (const file of files) {
      const fullPath = path.join(dir, file);
      const stat = await fs.promises.lstat(fullPath);

      if (stat.isDirectory()) {
        await traverseDirectory(fullPath);
      } else if (shouldReplaceInFile(file)) {
        await replaceInFile(fullPath);
      }
    }
  }

  await traverseDirectory(targetDir);
  consola.success("All string replacements have been made.");
}
