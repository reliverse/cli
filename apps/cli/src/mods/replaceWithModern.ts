import { glob } from "glob";
import fs from "fs-extra";
import path from "pathe";
import consola from "consola";

type ReplaceWithModernOptions = {
  projectPath: string;
};

export async function replaceWithModern({
  projectPath,
}: ReplaceWithModernOptions) {
  consola.info("Starting replacement of 'fs' and 'path' imports...");

  const files = await glob("**/*.{js,ts,tsx}", {
    cwd: projectPath,
    absolute: true,
    ignore: ["node_modules/**", "dist/**"],
  });

  for (const file of files) {
    const content = await fs.readFile(file, "utf8");

    const updatedContent = content
      .replace(/import fs from ["']fs["'];/g, 'import fs from "fs-extra";')
      .replace(/import path from ["']path["'];/g, 'import path from "pathe";');

    if (updatedContent !== content) {
      await fs.writeFile(file, updatedContent, "utf8");
      consola.success(`Updated imports in ${file}`);
    }
  }

  consola.info("Replacement process completed.");
}

async function runCodemod() {
  const projectPath = await consola.prompt(
    "Enter the path to your project or press Enter to use the current directory",
    {
      type: "text",
      default: path.resolve(),
    },
  );

  await replaceWithModern({ projectPath });
}

runCodemod().catch((err) => {
  consola.error("Codemod failed:", err);
});
