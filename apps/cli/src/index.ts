#!/usr/bin/env node
import { consola } from "consola";
import { showReliverseMenu } from "~/menu/00-showReliverseMenu";

async function main() {
  await showReliverseMenu();

  // consola.success("✨ Reliverse CLI v1.0.10");
}

main().catch((error) => {
  consola.error(`An error occurred: ${String(error)}`);
  process.exit(1);
});

/*
// import { consola } from "consola";
// import { showReliverseMenu } from "~/menu/00-showReliverseMenu";

// import { add } from "~/utils/cmds/add";
// import { diff } from "~/utils/cmds/diff";
// import { init } from "~/utils/cmds/init";
import { Command } from "commander";

import packageJson from "../package.json";

process.on("SIGINT", () => process.exit(0));
process.on("SIGTERM", () => process.exit(0));

// async function main() {
//   await showReliverseMenu();
// }

// main().catch((error) => {
//   consola.error(`An error occurred: ${String(error)}`);
//   process.exit(1);
// });

async function main() {
  const program = new Command()
    .name("shadcn")
    .description("add components and dependencies to your project")
    .version(
      packageJson.version || "1.0.0",
      "-v, --version",
      "display the version number",
    );

  // program.addCommand(init).addCommand(add).addCommand(diff);

  console.log("✨ Reliverse CLI v1.0.6");

  program.parse();
}

main().catch((error) => {
  console.error("An error occurred:", error);
  process.exit(1);
});
 */
