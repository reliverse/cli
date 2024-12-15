import { inputPrompt } from "@reliverse/prompts";
import pc from "picocolors";

import {
  readReliverseMemory,
  updateReliverseMemory,
} from "~/args/memory/impl.js";

export async function askUserName(): Promise<string> {
  const memory = await readReliverseMemory();

  let placeholder = "";
  let content = "";

  if (memory.name) {
    placeholder = memory.name;
    content = `Last used name: ${pc.cyanBright(placeholder)}`;
  }

  const name = await inputPrompt({
    title: "What name would you like to use in your project?",
    placeholder,
    content,
    validate: (value) => {
      if (!value?.trim()) {
        return "Name is required";
      }
    },
  });

  if (name && name !== placeholder) {
    await updateReliverseMemory({
      name,
    });
  }

  return name;
}
