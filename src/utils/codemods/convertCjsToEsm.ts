import { relinka } from "@reliverse/prompts";
import fs from "fs-extra";
import path from "pathe";
import { glob } from "tinyglobby";

export async function convertCjsToEsm(projectPath: string) {
  relinka("info", `Converting CommonJS to ESM in ${projectPath}`);

  const files = await glob("**/*.{js,jsx,ts,tsx}", {
    cwd: path.resolve(projectPath),
  });

  for (const file of files) {
    const filePath = path.join(projectPath, file);
    const content = await fs.readFile(filePath, "utf-8");
    let updatedContent = content;

    // Convert require statements to imports
    updatedContent = updatedContent
      // Convert const/let/var { x } = require('y') to import { x } from "y"
      .replace(
        /(?:const|let|var)\s*{\s*([^}]+)}\s*=\s*require\(['"]([^'"]+)['"]\)/g,
        'import { $1 } from "$2"',
      )
      // Convert const/let/var x = require('y') to import x from "y"
      .replace(
        /(?:const|let|var)\s+(\w+)\s*=\s*require\(['"]([^'"]+)['"]\)/g,
        'import $1 from "$2"',
      );

    // Convert module.exports to export
    updatedContent = updatedContent
      // Convert module.exports = x to export default x
      .replace(/module\.exports\s*=\s*([^;\n]+)/g, "export default $1")
      // Convert module.exports.x = y to export const x = y
      .replace(
        /module\.exports\.(\w+)\s*=\s*([^;\n]+)/g,
        "export const $1 = $2",
      )
      // Convert exports.x = y to export const x = y
      .replace(/exports\.(\w+)\s*=\s*([^;\n]+)/g, "export const $1 = $2");

    if (content !== updatedContent) {
      await fs.writeFile(filePath, updatedContent, "utf-8");
      relinka("info", `Converted ${filePath} to ESM`);
    }
  }
}
