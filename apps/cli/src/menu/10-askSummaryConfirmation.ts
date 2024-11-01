import { consola } from "consola";

import { validate } from "~/utils/validate";
import type { GitOption } from "~/menu/08-askGitInitialization";
import { verbose } from "~/utils/console";

export async function askSummaryConfirmation(
  template: string,
  projectName: string,
  githubUser: string,
  website: string,
  gitOption: GitOption,
  deps: boolean,
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

  verbose("info", "Installation confirmed by the user (1)."); // TODO: remove if random bun crash is fixed

  validate(confirmed, "boolean");

  if (!confirmed) {
    consola.info("Installation canceled by the user.");

    return false;
  }

  verbose("info", "Installation confirmed by the user (2).");

  return true;
}
