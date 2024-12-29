import { inputPrompt } from "@reliverse/prompts";

import {
  readReliverseMemory,
  updateReliverseMemory,
} from "~/args/memory/impl.js";
import { relinka } from "~/utils/console.js";

export async function askGithubName(): Promise<string | null> {
  try {
    const memory = await readReliverseMemory();
    if (!memory) {
      relinka("error", "Failed to read reliverse memory");
      return null;
    }

    if (memory.githubUsername && memory.githubUsername !== "") {
      return memory.githubUsername;
    }

    const ghUsername = await inputPrompt({
      title: "What's your GitHub username?",
      content:
        "💡 If you don't have a GitHub account, you can create one for free at https://github.com/signup",
      validate: (value: string | undefined) => {
        if (!value?.trim()) {
          return "GitHub username is required for deployment";
        }
        if (!/^[a-z\d](?:[a-z\d]|-(?=[a-z\d])){0,38}$/i.test(value)) {
          return "Invalid GitHub username format";
        }
        return true;
      },
    });

    if (ghUsername !== "" && ghUsername !== memory.githubUsername) {
      await updateReliverseMemory({
        githubUsername: ghUsername,
      });
    } else {
      relinka(
        "error",
        "Something went wrong while saving your GitHub username...",
      );
    }

    return ghUsername;
  } catch (error) {
    relinka(
      "error",
      "Failed to get GitHub username:",
      error instanceof Error ? error.message : String(error),
    );
    return null;
  }
}
