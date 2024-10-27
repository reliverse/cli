import { showReliverseMenu } from "~/prompts/00-showReliverseMenu";

async function main() {
  await showReliverseMenu();
}

main().catch((error) => {
  console.error(`An error occurred: ${String(error)}`);
  process.exit(1);
});
