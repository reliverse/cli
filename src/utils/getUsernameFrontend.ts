import { inputPrompt } from "@reliverse/prompts";
import { deleteLastLine } from "@reliverse/prompts";
import { re } from "@reliverse/relico";

import type { ReliverseMemory } from "~/utils/schemaMemory.js";

import { DEFAULT_CLI_USERNAME } from "~/app/constants.js";
import { updateReliverseMemory } from "~/utils/reliverseMemory.js";

export async function getUsernameFrontend(
  memory: ReliverseMemory,
  shouldAskIfExists: boolean,
): Promise<string | null> {
  if (!shouldAskIfExists && memory.name && memory.name !== "")
    return memory.name;

  const previousName = typeof memory.name === "string" ? memory.name : "";
  const hasPreviousName = previousName !== "";

  // Determine placeholder and content based on previous memory
  const placeholder = hasPreviousName ? previousName : DEFAULT_CLI_USERNAME;
  const content = hasPreviousName
    ? `Last used name: ${re.cyanBright(placeholder)} (just press <Enter> to use it again)`
    : `You can press Enter to use the default name: ${re.cyanBright(DEFAULT_CLI_USERNAME)}`;

  // Prompt the user for a name
  const userInput = await inputPrompt({
    title:
      "Enter a name/username for the frontend (e.g. footer, contact page, etc.):",
    content,
    placeholder: hasPreviousName
      ? "No worries about @ symbol anywhere, I'll add it for you."
      : `[Default: ${placeholder}] No worries about @ symbol anywhere, I'll add it for you.`,
    defaultValue: hasPreviousName ? previousName : DEFAULT_CLI_USERNAME,
  });

  // If user presses Enter (empty input):
  // - If there's a previous name, use it without saving to memory again
  // - If no previous name, use DEFAULT_CLI_USERNAME and save it
  const trimmedInput = userInput.trim();
  if (trimmedInput === "") {
    if (hasPreviousName) {
      return previousName;
    }
    await updateReliverseMemory({ name: DEFAULT_CLI_USERNAME });
    deleteLastLine();
    return DEFAULT_CLI_USERNAME;
  }

  // User provided a new name, save it to memory
  await updateReliverseMemory({ name: trimmedInput });
  return trimmedInput;
}
