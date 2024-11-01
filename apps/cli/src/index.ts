#!/usr/bin/env node
import { consola } from "consola";
import { Command } from "commander";
import { showReliverseMenu } from "~/menu/00-showReliverseMenu";
import { reliverseVersion } from "~/utils/reliverseVersion";

// process.on("SIGINT", () => process.exit(0));
// process.on("SIGTERM", () => process.exit(0));

async function main() {
  const program = new Command()
    .name("reliverse")
    .description("Reliverse CLI")
    // .version(reliverseVersion || "1.0.0", "-v, --version");
    .version("1.0.19", "-v, --version");
  program.parse(process.argv);

  // await showReliverseMenu(program);
  await showReliverseMenu();
}

main().catch((error) => {
  consola.error(`An error occurred: ${String(error)}`);
  process.exit(1);
});
