import fs from "fs-extra";
import path from "pathe";
import { glob } from "glob";
import consola from "consola";

export async function replaceImportSymbol(
  repo: string,
  from: string,
  to: string,
) {
  consola.info(`Replacing import symbols from "${from}" to "${to}" in ${repo}`);

  // Find files in the specified repo folder
  const files = await glob("**/*.{js,ts,tsx}", {
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
    consola.info(`Updated imports in ${filePath}`);
  }
}
