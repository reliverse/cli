import { relinka } from "@reliverse/relinka";
import fs from "fs-extra";
import { globby } from "globby";
import path from "pathe";

export async function replaceImportSymbol(
  repo: string,
  from: string,
  to: string,
) {
  relinka.info(`Replacing import symbols from "${from}" to "${to}" in ${repo}`);

  // Find files in the specified repo folder
  const files = await globby("**/*.{js,ts,tsx}", {
    cwd: path.resolve(repo),
  });

  // Update the imports in each file
  for (const file of files) {
    const filePath = path.join(repo, file);
    const content = await fs.readFile(filePath, "utf-8");
    const updatedContent = content.replace(
      new RegExp(`from '${from}`, "g"),
      `from '${to}`,
    );
    await fs.writeFile(filePath, updatedContent, "utf-8");
    relinka.info(`Updated imports in ${filePath}`);
  }
}
