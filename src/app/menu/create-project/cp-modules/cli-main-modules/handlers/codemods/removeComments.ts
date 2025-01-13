import { relinka } from "@reliverse/relinka";
import fs from "fs-extra";
import { globby } from "globby";
import path from "pathe";

// Cleanup's functions
export async function removeComments(cwd: string): Promise<void> {
  // Use Biome to remove comments if available, otherwise use regex
  const files = await globby("**/*.{js,jsx,ts,tsx}", { cwd });
  for (const file of files) {
    const content = await fs.readFile(path.join(cwd, file), "utf-8");
    const withoutComments = content
      .replace(/\/\*[\s\S]*?\*\//g, "") // Remove multi-line comments
      .replace(/\/\/.*/g, "") // Remove single-line comments
      .replace(/^\s*[\r\n]/gm, ""); // Remove empty lines
    await fs.writeFile(path.join(cwd, file), withoutComments);
  }
  relinka("success", "Removed comments from all TypeScript/JavaScript files");
}
