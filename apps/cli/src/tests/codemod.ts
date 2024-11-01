import consola from "consola";
import { replaceImportSymbol } from "~/mods/replaceImportSymbol";
import { getCurrentWorkingDirectory } from "~/utils/fs";

async function runReliverseCodemod() {
  const projectPath = await consola.prompt(
    "Enter the path to your project or press Enter to use the current directory",
    {
      type: "text",
      default: getCurrentWorkingDirectory(),
    },
  );

  await replaceImportSymbol(projectPath, "@", "~");
}

runReliverseCodemod().catch((err) =>
  consola.error("Failed to update project with reliverse updater", err),
);
