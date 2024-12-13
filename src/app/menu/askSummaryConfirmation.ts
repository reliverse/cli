import { confirmPrompt } from "@reliverse/prompts";
import pc from "picocolors";

import { relinka } from "~/utils/console.js";
import { validate } from "~/utils/validate.js";

export async function askSummaryConfirmation(
  template: string,
  projectName: string,
  githubUser: string,
  website: string,
): Promise<boolean> {
  // const depsMessage = deps
  //   ? "Yes, install dependencies"
  //   : "No, skip dependencies";
  // ${bar} - Install Dependencies: ${depsMessage}
  // ${bar} - Git Option: ${gitOption}

  const bar = pc.cyanBright("│ ");

  const message = `You have chosen the following options for your project:
${bar} - Template: ${template}
${bar} - Project Name: ${projectName}
${bar} - GitHub Username: ${githubUser}
${bar} - Website: ${website}
${bar} Do you want to proceed?`;

  const confirmed = await confirmPrompt({
    title: message,
  });

  relinka("info-verbose", "Installation confirmed by the user (1)."); // TODO: remove if random bun crash is fixed

  validate(confirmed, "boolean");

  if (!confirmed) {
    relinka("info", "Installation canceled by the user.");

    return false;
  }

  relinka("info-verbose", "Installation confirmed by the user (2).");

  return true;
}
