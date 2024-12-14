import { inputPrompt } from "@reliverse/prompts";
import pc from "picocolors";

import {
  readReliverseMemory,
  updateReliverseMemory,
} from "~/args/memory/impl.js";

export async function askGithubName(): Promise<string> {
  let placeholder = "";
  let content =
    "If you don't have a GitHub account yet, you can create one at: https://github.com/signup";

  const memory = await readReliverseMemory();
  if (memory.user?.githubName) {
    placeholder = memory.user.githubName;
    content = `Last used GitHub username: ${pc.cyanBright(placeholder)}`;
  }

  const githubName = await inputPrompt({
    title: "What's your GitHub username?",
    defaultValue: placeholder,
    hint: "This will be used for repository creation and deployment",
    content,
    contentColor: "dim",
    validate: (value: string): string | void => {
      if (!value?.trim()) {
        return "GitHub username is required for deployment";
      }
      if (!/^[a-zA-Z0-9-]+$/.test(value)) {
        return "Invalid GitHub username format";
      }
    },
  });

  if (githubName) {
    await updateReliverseMemory({
      user: { ...memory.user, githubName },
    });
  }

  return githubName;
}
