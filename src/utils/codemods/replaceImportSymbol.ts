import { relinka } from "@reliverse/prompts";
import fs from "fs-extra";
import path from "pathe";
import { glob } from "tinyglobby";

async function detectCurrentImportSymbol(
  projectPath: string,
): Promise<string | null> {
  // Common import symbols used in projects
  const commonSymbols = ["@", "~", "#", "$", "@src", "@app"];

  // Find files in the specified project folder
  const files = await glob("**/*.{js,jsx,ts,tsx}", {
    cwd: path.resolve(projectPath),
  });

  // Create a map to count symbol occurrences
  const symbolCounts = new Map<string, number>();

  // Analyze each file
  for (const file of files) {
    const filePath = path.join(projectPath, file);
    const content = await fs.readFile(filePath, "utf-8");

    // Check for import statements with common symbols
    for (const symbol of commonSymbols) {
      const importRegex = new RegExp(`(from|import)\\s+(['"])${symbol}/`, "g");
      const matches = content.match(importRegex);
      if (matches) {
        symbolCounts.set(
          symbol,
          (symbolCounts.get(symbol) ?? 0) + matches.length,
        );
      }
    }
  }

  // Find the most commonly used symbol
  let mostUsedSymbol: string | null = null;
  let maxCount = 0;

  symbolCounts.forEach((count, symbol) => {
    if (count > maxCount) {
      maxCount = count;
      mostUsedSymbol = symbol;
    }
  });

  return mostUsedSymbol;
}

export async function replaceImportSymbol(
  projectPath: string,
  toSymbol: string,
) {
  // Detect the current import symbol
  const fromSymbol = await detectCurrentImportSymbol(projectPath);

  if (!fromSymbol) {
    relinka(
      "warn",
      "No common import symbol detected in the project. No changes will be made.",
    );
    return;
  }

  relinka(
    "info",
    `Replacing import symbol "${fromSymbol}" with "${toSymbol}" in ${projectPath}`,
  );

  // Find files in the specified project folder
  const files = await glob("**/*.{js,jsx,ts,tsx}", {
    cwd: path.resolve(projectPath),
  });

  // Update the imports in each file
  for (const file of files) {
    const filePath = path.join(projectPath, file);
    const content = await fs.readFile(filePath, "utf-8");
    const updatedContent = content
      // Handle 'from' statements preserving quote style
      .replace(
        new RegExp(`from (['"])${fromSymbol}([^'"]*?)\\1`, "g"),
        (_match, quote, path) => `from ${quote}${toSymbol}${path}${quote}`,
      )
      // Handle direct imports preserving quote style
      .replace(
        new RegExp(`import (['"])${fromSymbol}([^'"]*?)\\1`, "g"),
        (_match, quote, path) => `import ${quote}${toSymbol}${path}${quote}`,
      );

    if (content !== updatedContent) {
      await fs.writeFile(filePath, updatedContent, "utf-8");
      relinka("info", `Updated imports in ${filePath}`);
    }
  }
}
