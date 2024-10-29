import { glob } from "glob";
import fs from "fs-extra";
import path from "pathe";
import consola from "consola";

type ReplaceImportSymbolOptions = {
  projectPath: string;
  from: string;
  to: string;
};

export async function replaceImportSymbol({
  projectPath,
  from,
  to,
}: ReplaceImportSymbolOptions) {
  consola.info(`Replacing ${from} with ${to} in files under ${projectPath}`);

  const files = await glob("**/*.{js,ts,tsx}", {
    cwd: projectPath,
  });

  for (const file of files) {
    const filePath = path.join(projectPath, file);
    const content = await fs.readFile(filePath, "utf8");
    const updatedContent = content.replace(
      new RegExp(`from '${from}`, "g"),
      `from '${to}`,
    );
    await fs.writeFile(filePath, updatedContent, "utf8");
  }
}
