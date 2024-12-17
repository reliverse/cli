import { deleteLastLine, inputPrompt, msg } from "@reliverse/prompts";
import pc from "picocolors";

import {
  readReliverseMemory,
  updateReliverseMemory,
} from "~/args/memory/impl.js";
import { relinka } from "~/utils/console.js";

const DEFAULT_NAME = "johnny911";

export async function askUserName(): Promise<string> {
  const memory = await readReliverseMemory();
  const previousName = typeof memory.name === "string" ? memory.name : "";
  const hasPreviousName = previousName !== "";

  // Determine placeholder and content based on previous memory
  const placeholder = hasPreviousName ? previousName : DEFAULT_NAME;
  const content = hasPreviousName
    ? `Last used name: ${pc.cyanBright(placeholder)} (press <Enter> to use it again)`
    : `You can press Enter to use the default name: ${pc.green(DEFAULT_NAME)}`;

  // Prompt the user for a name
  const userInput = await inputPrompt({
    title:
      "Enter a name/username for the frontend (e.g. footer, contact page, etc.):",
    content,
    placeholder: hasPreviousName ? "" : `Default: ${placeholder}`,
  });

  // If the user leaves the input empty, we fall back to placeholder
  const finalName = userInput.trim() || placeholder;

  // Update memory only if the provided name differs from what was stored
  if (!hasPreviousName || finalName !== previousName) {
    await updateReliverseMemory({ name: finalName });
  }

  // If the user leaves the input empty
  if (finalName === placeholder) {
    deleteLastLine();
    deleteLastLine();
    msg({
      type: "M_MIDDLE",
      title: `  ${placeholder}`,
      addNewLineAfter: true,
    });
  }

  relinka(
    "info",
    "In the next prompts, GitHub and Vercel names may also be asked, depending on if you require deployment.",
  );

  return finalName;
}
