import { intro, outro } from "@clack/prompts";
import color from "picocolors";
import { version } from "../package.json";
import { getPackageManagerName } from "~/utils";
import { handleModeSelection } from "~/handlers/handleModeSelection";
import { handleProjectSelection } from "~/handlers/handleProjectSelection";
import { promptForDetails } from "~/handlers/promptForDetails";

async function main() {
  console.log();
  const pm = await getPackageManagerName();
  intro(color.inverse(color.bold(` Reliverse CLI v${version} via ${pm} `)));

  const mode = await handleModeSelection();
  if (!mode) return;
  const kind = await handleProjectSelection();
  if (!kind) return;
  await promptForDetails();

  outro(color.inverse(color.bold(" https://discord.gg/Pb8uKbwpsJ ")));
}

await main().catch((error) => {
  console.error("│  An error occurred:\n", error.message);
  console.error(
    "└  Please report this issue at https://github.com/blefnk/reliverse/issues",
  );
  process.exit(1);
});
