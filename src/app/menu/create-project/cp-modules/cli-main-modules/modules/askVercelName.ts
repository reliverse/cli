import { inputPrompt } from "@reliverse/prompts";

import type { ReliverseMemory } from "~/types.js";

import { updateReliverseMemory } from "~/utils/reliverseMemory.js";

export async function askVercelName(
  memory: ReliverseMemory,
): Promise<string | null> {
  let placeholder = "";

  if (memory.vercelUsername) {
    placeholder = memory.vercelUsername;
  }

  if (placeholder === "") {
    placeholder = await inputPrompt({
      title: "What's your Vercel team name?",
      validate: (value: string): string | boolean => {
        if (!value?.trim()) {
          return "Vercel username is required for deployment";
        }
        if (!/^[a-z\d](?:[a-z\d]|-(?=[a-z\d])){0,38}$/i.test(value)) {
          return "Invalid Vercel username format";
        }
        return true;
      },
    });
  }

  if (placeholder !== "" && placeholder !== memory.vercelUsername) {
    await updateReliverseMemory({
      vercelUsername: placeholder,
    });
  }

  return placeholder;
}
