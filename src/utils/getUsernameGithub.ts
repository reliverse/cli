import { inputPrompt, relinka } from "@reliverse/prompts";

import type { ReliverseMemory } from "./schemaMemory.js";

import { updateReliverseMemory } from "./reliverseMemory.js";

export async function getUsernameGithub(
  memory: ReliverseMemory,
  frontendUsername: string,
): Promise<string> {
  // Return the existing GitHub username if it's already set and non-empty
  if (memory.githubUsername?.trim()) {
    return memory.githubUsername;
  }

  const githubUsername = await inputPrompt({
    title: `What's your GitHub username?`,
    content:
      "If you don't have a GitHub account, you can create one for free at https://github.com/signup",
    hint: `Leave empty if your GitHub username matches your frontend username and you want to use it: ${frontendUsername}`,
    defaultValue: frontendUsername ?? "",
    validate: (value?: string) => {
      const trimmed = value?.trim();
      if (!trimmed) return "A GitHub username is required for the next steps.";
      if (!/^[a-z\d](?:[a-z\d]|-(?=[a-z\d])){0,38}$/i.test(trimmed)) {
        return "Invalid GitHub username format. It must be 1-39 characters long, contain only letters, numbers, or dashes, and cannot start or end with a dash.";
      }
      return true;
    },
  });

  // Ensure the retrieved username is non-empty
  if (!githubUsername.trim()) {
    relinka("error", "Invalid GitHub username provided.");
    throw new Error("GitHub username input is invalid.");
  }

  // Persist the GitHub username
  await updateReliverseMemory({ githubUsername });

  // Update the in-memory reference
  memory.githubUsername = githubUsername;

  // Return the validated GitHub username
  return githubUsername;
}
