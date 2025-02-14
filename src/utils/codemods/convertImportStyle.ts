import { relinka } from "@reliverse/prompts";
import fs from "fs-extra";
import path from "pathe";
import { glob } from "tinyglobby";

export async function convertImportStyle(
  projectPath: string,
  targetStyle: "import" | "require",
) {
  relinka("info", `Converting to ${targetStyle} style in ${projectPath}`);

  const files = await glob("**/*.{js,jsx,ts,tsx}", {
    cwd: path.resolve(projectPath),
  });

  for (const file of files) {
    const filePath = path.join(projectPath, file);
    const content = await fs.readFile(filePath, "utf-8");
    let updatedContent = content;

    if (targetStyle === "import") {
      // Convert require to import
      updatedContent = content
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
    } else {
      // Convert import to require
      updatedContent = content
        // Convert import { x } from "y" to const { x } = require('y')
        .replace(
          /import\s*{\s*([^}]+)}\s*from\s*['"]([^'"]+)['"]/g,
          "const { $1 } = require('$2')",
        )
        // Convert import x from "y" to const x = require('y')
        .replace(
          /import\s+(\w+)\s+from\s+['"]([^'"]+)['"]/g,
          "const $1 = require('$2')",
        );
    }

    if (content !== updatedContent) {
      await fs.writeFile(filePath, updatedContent, "utf-8");
      relinka("info", `Updated import style in ${filePath}`);
    }
  }
}
