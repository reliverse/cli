import { inputPrompt } from "@reliverse/prompts";

import { relinka } from "~/utils/console.js";
import { getCurrentWorkingDirectory } from "~/utils/fs.js";
import { replaceImportSymbol } from "~/utils/mods/replaceImportSymbol.js";

async function runReliverseUpdater() {
  const projectPath = await inputPrompt({
    title:
      "Enter the path to your project or press Enter to use the current directory",
    defaultValue: getCurrentWorkingDirectory(),
  });

  await replaceImportSymbol(projectPath, "@", "~");
}

runReliverseUpdater().catch((err) =>
  relinka(
    "error",
    "Failed to update project with reliverse updater",
    err.toString(),
  ),
);
