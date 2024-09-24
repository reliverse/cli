import { consola } from "consola";
import { generate } from "random-words";

import { validate } from "~/utils/validate";

// Prompt user for the project name
export async function appName(): Promise<string> {
  const placeholder = generate({ exactly: 3, join: "-" });
  const name = await consola.prompt("Enter the project name:", {
    default: placeholder,
    placeholder,
    type: "text",
  });

  validate(name, "string", "Project creation canceled.");

  return name;
}

// Prompt user for confirmation about installing dependencies
export async function dependencies(
  mode: "buildRelivator" | "cloneLibraryTool" | "justInstallRelivator",
): Promise<boolean> {
  if (mode === "cloneLibraryTool") {
    consola.info(
      "Currently, in `cloneLibraryTool` mode deps may be not installed when choosing Y, please run `bun i` manually.",
    );
  }

  const deps = await consola.prompt(
    "Do you want to install the project dependencies?",
    { initial: false, type: "confirm" },
  );

  validate(deps, "boolean", "Installation canceled by the user.");

  return deps;
}

// Prompt user for confirmation before proceeding with installation
export async function confirmation(): Promise<boolean> {
  const confirmed = await consola.prompt(
    "Press `Y` to proceed with the selected template installation.",
    { type: "confirm" },
  );

  validate(confirmed, "boolean");

  if (!confirmed) {
    consola.info("Installation canceled by the user.");

    return false;
  }

  return true;
}

// Prompt user to choose the template
export async function chooseTemplate(): Promise<string> {
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
        "relivator-nextjs-template",
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

// Prompt user about initializing Git or keeping the .git folder
export async function gitInitialization(): Promise<string> {
  const gitOption = await consola.prompt(
    "Do you want to initialize a Git repository, keep the existing .git folder, or do nothing?",
    {
      options: [
        "Initialize new Git repository",
        "Keep existing .git folder (for forking later) [🚨 option is under development, may not work]",
        "Do nothing",
      ] as const,
      type: "select",
    },
  );

  return gitOption;
}
