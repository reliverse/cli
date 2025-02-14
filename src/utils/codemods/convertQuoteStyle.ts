import { relinka } from "@reliverse/prompts";
import fs from "fs-extra";
import path from "pathe";
import { glob } from "tinyglobby";

export async function convertQuoteStyle(
  projectPath: string,
  targetQuoteStyle: "single" | "double",
) {
  relinka(
    "info",
    `Converting quotes to ${targetQuoteStyle} quotes in ${projectPath}`,
  );

  const files = await glob("**/*.{js,jsx,ts,tsx}", {
    cwd: path.resolve(projectPath),
  });

  for (const file of files) {
    const filePath = path.join(projectPath, file);
    const content = await fs.readFile(filePath, "utf-8");

    // Convert string literals while preserving escaped quotes
    const updatedContent = content.replace(
      /(['"])((?:\\\1|(?!\1).)*?)\1/g,
      (_match: string, _quote: string, content: string) => {
        const targetQuote = targetQuoteStyle === "single" ? "'" : '"';
        // Escape any instances of the target quote in the content
        const escapedContent = content.replace(
          new RegExp(targetQuote, "g"),
          `\\${targetQuote}`,
        );
        // Unescape the other type of quote
        const otherQuote = targetQuoteStyle === "single" ? '"' : "'";
        const unescapedContent = escapedContent.replace(
          new RegExp(`\\\\${otherQuote}`, "g"),
          otherQuote,
        );
        return `${targetQuote}${unescapedContent}${targetQuote}`;
      },
    );

    if (content !== updatedContent) {
      await fs.writeFile(filePath, updatedContent, "utf-8");
      relinka("info", `Updated quotes in ${filePath}`);
    }
  }
}
