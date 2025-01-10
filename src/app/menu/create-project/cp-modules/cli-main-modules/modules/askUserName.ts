import { inputPrompt } from "@reliverse/prompts";
import pc from "picocolors";

import type { ReliverseMemory } from "~/types.js";

import { relinka } from "~/utils/loggerRelinka.js";
import { updateReliverseMemory } from "~/utils/reliverseMemory.js";

const DEFAULT_NAME = "johnny911";

export async function askUserName(
  memory: ReliverseMemory,
): Promise<string | null> {
  const previousName = typeof memory.name === "string" ? memory.name : "";
  const hasPreviousName = previousName !== "";

  // Determine placeholder and content based on previous memory
  const placeholder = hasPreviousName ? previousName : DEFAULT_NAME;
  const content = hasPreviousName
    ? `Last used name: ${pc.cyanBright(placeholder)} (press <Enter> to use it again)`
    : `You can press Enter to use the default name: ${pc.cyanBright(DEFAULT_NAME)}`;

  // Prompt the user for a name
  const userInput = await inputPrompt({
    title:
      "Enter a name/username for the frontend (e.g. footer, contact page, etc.):",
    content,
    placeholder: hasPreviousName
      ? ""
      : `[Default: ${placeholder}] No worries about @ symbol anywhere, I'll add it for you.`,
  });

  // If the user leaves the input empty, we fall back to placeholder
  const finalName = userInput.trim() ?? placeholder;

  // Update memory only if the provided name differs from what was stored
  if (!hasPreviousName || finalName !== previousName) {
    await updateReliverseMemory({ name: finalName });
  }

  relinka(
    "info",
    "In the next prompts, GitHub and Vercel names may also be asked, depending on if you require deployment.",
  );

  return finalName;
}
