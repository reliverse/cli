import { inputPrompt } from "@reliverse/prompts";
import pc from "picocolors";

import {
  readReliverseMemory,
  updateReliverseMemory,
} from "~/args/memory/impl.js";

export async function askUserName(): Promise<string> {
  let placeholder = "John Doe";
  let content =
    "This name will be used in your project's UI (e.g., footer, about page)";

  const memory = await readReliverseMemory();
  if (memory.user?.name) {
    placeholder = memory.user.name;
    content = `Last used name: ${pc.cyanBright(placeholder)}`;
  }

  const username = await inputPrompt({
    title: "What name would you like to use in your project?",
    defaultValue: placeholder,
    content,
    contentColor: "dim",
    validate: (value: string): string | void => {
      if (!value?.trim()) {
        return "Name is required";
      }
    },
  });

  if (username && username !== placeholder) {
    await updateReliverseMemory({
      user: { ...memory.user, name: username },
    });
  }

  return username;
}
