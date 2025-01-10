import { selectPrompt, inputPrompt } from "@reliverse/prompts";

import { relinka } from "~/app/menu/create-project/cp-modules/cli-main-modules/handlers/logger.js";
import { validate } from "~/app/menu/create-project/cp-modules/cli-main-modules/handlers/validate.js";

import { replaceImportSymbol } from "../handlers/codemods/replaceImportSymbol.js";

export async function askCodemodUserCodebase(cwd: string) {
  relinka("info", "The code modification process will start now.");

  // Prompt for project path or use the current working directory
  const projectPath = await inputPrompt({
    title:
      "Enter the path to your project or press Enter to use the current directory",
    defaultValue: cwd,
  });

  // Validate project path
  validate(projectPath, "string", "Invalid project path provided. Exiting.");

  const action = await selectPrompt({
    title: "Select the action to perform",
    options: [
      {
        label: "Replace import symbol with another",
        value: "replaceImportSymbol",
      },
    ],
  });

  validate(action, "string", "Invalid option selected. Exiting.");

  if (action === "replaceImportSymbol") {
    const to = await inputPrompt({
      title: "Enter the import symbol to replace with",
      defaultValue: "~",
    });

    await replaceImportSymbol(projectPath, to);
  }
}
