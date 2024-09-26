import { consola } from "consola";

import { validate } from "~/prompts/utils/validate";

// Prompt user for confirmation before proceeding with installation
export async function confirmation(
  template: string,
  projectName: string,
  githubUser: string,
  website: string,
  gitOption: string,
  deps: boolean, // Indicates whether to install dependencies or not
): Promise<boolean> {
  const depsMessage = deps
    ? "Yes, install dependencies"
    : "No, skip dependencies";

  const message = `You have chosen the following options for your project:
  - Template: ${template}
  - Project Name: ${projectName}
  - GitHub Username: ${githubUser}
  - Website: ${website}
  - Git Option: ${gitOption}
  - Install Dependencies: ${depsMessage}

  Do you want to proceed?`;

  const confirmed = await consola.prompt(message, { type: "confirm" });

  validate(confirmed, "boolean");

  if (!confirmed) {
    consola.info("Installation canceled by the user.");

    return false;
  }

  return true;
}
