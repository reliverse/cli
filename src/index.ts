import { consola } from "consola";
import { showReliverseMenu } from "~/prompts/00-showReliverseMenu";

async function main() {
  await showReliverseMenu();
}

main().catch((error) => {
  consola.error(`An error occurred: ${String(error)}`);
  process.exit(1);
});
