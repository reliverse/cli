import { inputPrompt } from "@reliverse/prompts";
import pc from "picocolors";

import {
  readReliverseMemory,
  updateReliverseMemory,
} from "~/args/memory/impl.js";

export async function askVercelName(): Promise<string> {
  let placeholder = "";
  let content =
    "If you don't have a Vercel account yet, you can create one at: https://vercel.com/signup";

  const memory = await readReliverseMemory();
  if (memory.user?.vercelName) {
    placeholder = memory.user.vercelName;
    content = `Last used Vercel username: ${pc.cyanBright(placeholder)}`;
  }

  const vercelName = await inputPrompt({
    title: "What's your Vercel team name?",
    defaultValue: placeholder,
    hint: "This will be used for project deployment. Your teams are here: https://vercel.com/account (All accounts have a default Hobby team)",
    content,
    contentColor: "dim",
    validate: (value: string): string | void => {
      if (!value?.trim()) {
        return "Vercel team name is required for deployment";
      }
      if (!/^[a-zA-Z0-9-]+$/.test(value)) {
        return "Invalid Vercel team name format";
      }
    },
  });

  if (vercelName) {
    await updateReliverseMemory({
      user: { ...memory.user, vercelName },
    });
  }

  return vercelName;
}
