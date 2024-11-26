import { inputPrompt } from "@reliverse/prompts";
import { relinka } from "@reliverse/relinka";
import fs from "fs-extra";
import { glob } from "glob";
import path from "pathe";

type ReplaceWithModernOptions = {
  projectPath: string;
};

export async function replaceWithModern({
  projectPath,
}: ReplaceWithModernOptions) {
  relinka.info("Starting replacement of 'fs' and 'path' imports...");

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
      relinka.success(`Updated imports in ${file}`);
    }
  }

  relinka.info("Replacement process completed.");
}

async function runCodemod() {
  const projectPath = await inputPrompt({
    title:
      "Enter the path to your project or press Enter to use the current directory",
    defaultValue: path.resolve(),
  });

  await replaceWithModern({ projectPath });
}

runCodemod().catch((err) => {
  relinka.error("Codemod failed:", err);
});
