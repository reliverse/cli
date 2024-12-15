import { inputPrompt } from "@reliverse/prompts";
import pc from "picocolors";

import {
  readReliverseMemory,
  updateReliverseMemory,
} from "~/args/memory/impl.js";

export async function askVercelName(): Promise<string> {
  const memory = await readReliverseMemory();

  let placeholder = "";
  let content = "";

  if (memory.vercelUsername) {
    placeholder = memory.vercelUsername;
    content = `Last used Vercel username: ${pc.cyanBright(placeholder)}`;
  }

  const vercelUsername = await inputPrompt({
    title: "What's your Vercel username or team slug?",
    placeholder,
    content,
    validate: (value) => {
      if (!value?.trim()) {
        return "Vercel username is required for deployment";
      }
      if (!/^[a-z\d](?:[a-z\d]|-(?=[a-z\d])){0,38}$/i.test(value)) {
        return "Invalid Vercel username format";
      }
    },
  });

  if (vercelUsername && vercelUsername !== placeholder) {
    await updateReliverseMemory({
      vercelUsername,
    });
  }

  return vercelUsername;
}
