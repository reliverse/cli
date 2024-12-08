import { inputPrompt } from "@reliverse/prompts";
import pc from "picocolors";

import {
  readReliverseMemory,
  updateReliverseMemory,
} from "~/args/memory/impl.js";

export async function askUserName(): Promise<string> {
  // TODO: fetch from GitHub after login
  let placeholder = "johnny911";
  let content = `I recommend using your or your org's GitHub handle (username).\nIf you don't have one yet, you can create an account here: https://github.com/signup \nDon't worry about adding the @ symbol—I’ll take care of that for you.`;

  const memory = await readReliverseMemory();
  if (memory.user?.name) {
    placeholder = memory.user.name;
    content = `Last time you called yourself ${pc.cyanBright(placeholder)}.`;
  }

  const username = await inputPrompt({
    title:
      "Your app will feature a handle (e.g., in the footer section). What should it be?",
    defaultValue: placeholder,
    hint: `Press <Enter> to use the default value. [Default: ${placeholder}]`,
    content,
    contentColor: "dim",
    // schema: schema.properties.username,
  });

  if (username !== "johnny911") {
    await updateReliverseMemory({
      user: { name: username },
    });
  }

  return username;
}
