import { confirmPrompt } from "@reliverse/prompts";
import { relinka } from "@reliverse/relinka";
import pc from "picocolors";

import { verbose } from "~/utils/console.js";
import { validate } from "~/utils/validate.js";

import type { GitOption } from "./askGitInitialization.js";

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

  const bar = pc.cyanBright("│ ");

  const message = `You have chosen the following options for your project:
${bar} - Template: ${template}
${bar} - Project Name: ${projectName}
${bar} - GitHub Username: ${githubUser}
${bar} - Website: ${website}
${bar} - Git Option: ${gitOption}
${bar} - Install Dependencies: ${depsMessage}
${bar} Do you want to proceed?`;

  const confirmed = await confirmPrompt({
    title: message,
  });

  verbose("info", "Installation confirmed by the user (1)."); // TODO: remove if random bun crash is fixed

  validate(confirmed, "boolean");

  if (!confirmed) {
    relinka.info("Installation canceled by the user.");

    return false;
  }

  verbose("info", "Installation confirmed by the user (2).");

  return true;
}
