import { inputPrompt } from "@reliverse/prompts";
import pc from "picocolors";

import {
  readReliverseMemory,
  updateReliverseMemory,
} from "~/args/memory/impl.js";

export async function askGithubName(): Promise<string> {
  const memory = await readReliverseMemory();

  let placeholder = "";
  let content = "";

  if (memory.githubUsername) {
    placeholder = memory.githubUsername;
    content = `Last used GitHub username: ${pc.cyanBright(placeholder)}`;
  }

  const githubUsername = await inputPrompt({
    title: "What's your GitHub username?",
    placeholder,
    content,
    validate: (value) => {
      if (!value?.trim()) {
        return "GitHub username is required for deployment";
      }
      if (!/^[a-z\d](?:[a-z\d]|-(?=[a-z\d])){0,38}$/i.test(value)) {
        return "Invalid GitHub username format";
      }
    },
  });

  if (githubUsername && githubUsername !== placeholder) {
    await updateReliverseMemory({
      githubUsername,
    });
  }

  return githubUsername;
}
