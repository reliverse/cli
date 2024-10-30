import { consola } from "consola";

export type GitOption =
  | "Initialize new Git repository"
  | "Keep existing .git folder (for forking later) [🚨 option is under development, may not work]"
  | "Do nothing";

export async function askGitInitialization(): Promise<GitOption> {
  const gitOption = await consola.prompt(
    "Do you want to initialize a Git repository, keep the existing .git folder, or do nothing?",
    {
      options: [
        "Initialize new Git repository",
        "Keep existing .git folder (for forking later) [🚨 option is under development, may not work]",
        "Do nothing",
      ] as GitOption[],
      type: "select",
    },
  );

  return gitOption;
}
