import { consola } from "consola";

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
