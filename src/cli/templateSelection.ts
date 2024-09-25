// templateSelection.ts
import { consola } from "consola";

import { validate } from "~/utils/validate";

export async function selectTemplate(): Promise<string> {
  const templateOption = await consola.prompt(
    "Select a template or provide a custom GitHub URL:",
    {
      options: [
        "1. Use skateshop template (to have full Relivator version)",
        "2. Use minext template (to have minimal Relivator version)",
        "3. Provide custom GitHub URL (at your own risk)",
      ] as const,
      type: "select",
    },
  );

  let template = "";

  if (
    templateOption ===
    "1. Use skateshop template (to have full Relivator version)"
  ) {
    template = "sadmann7/skateshop";
  } else if (
    templateOption ===
    "2. Use minext template (to have minimal Relivator version)"
  ) {
    template = "blefnk/minext";
  } else if (
    templateOption === "3. Provide custom GitHub URL (at your own risk)"
  ) {
    const customTemplate = await consola.prompt(
      "Enter the GitHub repository link:",
      { type: "text" },
    );

    validate(customTemplate, "string", "Custom template selection canceled.");
    template = customTemplate;
  } else {
    consola.error("Invalid option selected. Exiting.");

    throw new Error("Invalid template selection");
  }

  return template;
}
