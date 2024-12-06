import { inputPrompt } from "@reliverse/prompts";
import { relinka } from "@reliverse/relinka";

import { getCurrentWorkingDirectory } from "~/utils/fs.js";
import { replaceImportSymbol } from "~/utils/mods/replaceImportSymbol.js";

async function runReliverseCodemod() {
  const projectPath = await inputPrompt({
    title:
      "Enter the path to your project or press Enter to use the current directory",
    defaultValue: getCurrentWorkingDirectory(),
  });

  await replaceImportSymbol(projectPath, "@", "~");
}

runReliverseCodemod().catch((err) =>
  relinka.error("Failed to update project with reliverse updater", err),
);
