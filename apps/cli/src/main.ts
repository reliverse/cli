import { intro, outro } from "@clack/prompts";
import color from "picocolors";
import { version } from "../package.json";
import { getPackageManagerName, title } from "~/utils/generalUtils";
import { askModeSelection } from "~/ask/askModeSelection";
import { askProjectSelection } from "~/ask/askProjectSelection";
import { askProjectDetails } from "~/ask/askProjectDetails";
import { askStackSelection } from "~/ask/askStackSelection";

async function main() {
  console.log();
  const pm = await getPackageManagerName();
  intro(color.inverse(color.bold(` Reliverse CLI v${version} via ${pm} `)));

  if (pm === "bun") {
    console.log(
      color.italic(
        color.dim(
          "│\n│  🚨 Bun is still unstable, random crashes are possible. Please just try again if it happens or use pnpm, yarn, or npm.",
        ),
      ),
    );
  }

  const mode = await askModeSelection();
  if (!mode) return;

  const kind = await askProjectSelection();
  if (!kind) return;

  await askProjectDetails();

  console.log(
    color.italic(
      color.dim(
        "│\n│  🚨 If you ever need to exit, just press Ctrl+C at any time.",
      ),
    ),
  );

  // TODO: Uncomment this once we understand why it crashes in Bun.
  // const stack = await askStackSelection();
  // if (!stack) return;

  // TODO: Research whether `intro` and `outro` cause a crash in Bun.
  outro(color.inverse(color.bold(" https://discord.gg/Pb8uKbwpsJ ")));
}

await main().catch((error) => {
  console.error("│  An error occurred:\n", error.message);
  console.error(
    "└  Please report this issue at https://github.com/blefnk/reliverse/issues",
  );
  process.exit(1);
});
