import { consola } from "consola";
import { replaceImportSymbol } from "~/mods/replaceImportSymbol";
import { validate } from "~/utils/validate";
import { getCurrentWorkingDirectory } from "~/utils/fs"; // Assuming this helper function exists

export async function askCodemodUserCodebase() {
  consola.info("The code modification process will start now.");

  // Prompt for project path or use the current working directory
  const projectPath = await consola.prompt(
    "Enter the path to your project or press Enter to use the current directory",
    {
      type: "text",
      default: getCurrentWorkingDirectory(),
    },
  );

  // Validate project path
  validate(projectPath, "string", "Invalid project path provided. Exiting.");

  const action = await consola.prompt("Select the action to perform", {
    options: ["Replace import symbol with another"],
    type: "select",
  });

  validate(action, "string", "Invalid option selected. Exiting.");

  if (action === "Replace import symbol with another") {
    const from = await consola.prompt("Enter the import symbol to replace", {
      type: "text",
      default: "@",
    });
    const to = await consola.prompt("Enter the import symbol to replace with", {
      type: "text",
      default: "~",
    });

    await replaceImportSymbol(projectPath, from, to);
  }
}
