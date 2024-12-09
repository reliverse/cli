import { selectPrompt } from "@reliverse/prompts";

export type GitOption =
  | "initializeNewGitRepository"
  | "keepExistingGitFolder"
  | "doNothing";

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
        label:
          "Keep existing .git folder (for forking later) [🚨 option is under development, may not work]",
        value: "keepExistingGitFolder",
      },
      {
        label: "Do nothing",
        value: "doNothing",
      },
    ],
  });

  return gitOption;
}
