import { selectWithConfig } from "~/prompts";
import { outro } from "@clack/prompts";
import color from "picocolors";
import { modes, menuModes } from "~/config";

export async function handleModeSelection(): Promise<string | undefined> {
  const mode = await selectWithConfig(
    color.cyanBright(color.bold("https://docs.reliverse.org")),
    menuModes,
  );

  if (mode === modes.exit) {
    outro(color.inverse(color.bold(" https://discord.gg/Pb8uKbwpsJ ")));
    return;
  }

  return mode;
}
