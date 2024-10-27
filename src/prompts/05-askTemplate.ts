// chooseTemplate.ts
import { consola } from "consola";

import { validate } from "~/prompts/utils/validate";

export async function buildRelivatorTemplate(): Promise<string> {
  const templateOption = await consola.prompt(
    "Select a template or provide a custom GitHub URL:",
    {
      options: [
        // "1. Use skateshop template to have full Relivator version",
        // "2. Use minext template to have minimal Relivator version",
        "1. Use reliverse/next-react-js-minimal template",
        "2. Provide custom GitHub URL (🚨 at your own risk)",
      ] as const,
      type: "select",
    },
  );

  let template = "";

  if (templateOption === "1. Use reliverse/next-react-js-minimal template") {
    template = "reliverse/next-react-js-minimal";
  }

  // else if (
  //   templateOption ===
  //   "2. Use minext template to have minimal Relivator version"
  // ) {
  //   template = "blefnk/minext";
  // }
  else if (
    templateOption === "2. Provide custom GitHub URL (🚨 at your own risk)"
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

// Prompt user to choose the template
export async function askTemplate(): Promise<string> {
  const templateCategory = await consola.prompt("Choose a template category:", {
    options: ["Install Reliverse Template", "Install External Template"],
    type: "select",
  });

  if (templateCategory === "Install Reliverse Template") {
    const reliverseTemplate = await consola.prompt(
      "Select a Reliverse template:",
      {
        options: [
          "blefnk/relivator-nextjs-template",
          "blefnk/astro-starlight-template",
        ],
        type: "select",
      },
    );

    validate(reliverseTemplate, "string", "Template selection canceled.");

    return reliverseTemplate;
  }

  if (templateCategory === "Install External Template") {
    const externalTemplate = await consola.prompt(
      "Select an external template or provide a custom GitHub link:",
      {
        options: [
          "blefnk/create-next-app",
          "blefnk/create-t3-app",
          "Provide custom GitHub link",
        ],
        type: "select",
      },
    );

    if (externalTemplate === "Provide custom GitHub link") {
      const defaultLinks = [
        "reliverse/acme",
        "blefnk/relivator-nextjs-template",
        "blefnk/astro-starlight-template",
      ];

      const randomDefaultLink =
        defaultLinks[Math.floor(Math.random() * defaultLinks.length)];

      const customLink = await consola.prompt(
        "Enter the GitHub repository link:",
        {
          default: randomDefaultLink,
          placeholder: randomDefaultLink,
          type: "text",
        },
      );

      validate(customLink, "string", "Custom template selection canceled.");

      return customLink;
    }

    validate(externalTemplate, "string", "Template selection canceled.");

    return externalTemplate;
  }

  throw new Error("Unexpected template selection error.");
}
