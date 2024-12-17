import { selectPrompt } from "@reliverse/prompts";

import type { GitOption } from "~/types.js";

export async function askGitInitialization(): Promise<GitOption> {
  const gitOption = await selectPrompt({
    title:
      "Do you want to initialize a Git repository, keep the existing .git folder, or do nothing?",
    options: [
      {
        label: "Initialize new Git repository",
        value: "initializeNewGitRepository",
      },
      {
        label: "Keep existing .git folder (for forking purposes)",
        value: "keepExistingGitFolder",
      },
    ],
  });

  return gitOption;
}
