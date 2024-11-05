import { selectWithConfig } from "~/utils/promptsUtils";
import { outro } from "@clack/prompts";
import color from "picocolors";
import { modes, menuModes } from "~/prompts";
import { title } from "~/utils/generalUtils";

export async function askModeSelection(): Promise<string | undefined> {
  const mode = await selectWithConfig(
    title("https://docs.reliverse.org"),
    menuModes,
  );

  if (mode === modes.exit) {
    outro(color.inverse(color.bold(" https://discord.gg/Pb8uKbwpsJ ")));
    return;
  }

  return mode;
}
