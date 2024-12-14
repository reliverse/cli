import fs from "fs-extra";
import { globby } from "globby";
import path from "pathe";

import { relinka } from "~/utils/console.js";

export async function replaceImportSymbol(
  projectPath: string,
  from: string,
  to: string,
) {
  relinka(
    "info",
    `Replacing import symbols from "${from}" to "${to}" in ${projectPath}`,
  );

  // Find files in the specified project folder
  const files = await globby("**/*.{js,jsx,ts,tsx}", {
    cwd: path.resolve(projectPath),
  });

  // Update the imports in each file
  for (const file of files) {
    const filePath = path.join(projectPath, file);
    const content = await fs.readFile(filePath, "utf-8");
    const updatedContent = content
      // Handle 'from' statements preserving quote style
      .replace(
        new RegExp(`from (['"])${from}\\1`, "g"),
        (match, quote) => `from ${quote}${to}${quote}`,
      )
      // Handle direct imports preserving quote style
      .replace(
        new RegExp(`import (['"])${from}\\1`, "g"),
        (match, quote) => `import ${quote}${to}${quote}`,
      );

    if (content !== updatedContent) {
      await fs.writeFile(filePath, updatedContent, "utf-8");
      relinka("info", `Updated imports in ${filePath}`);
    }
  }
}
