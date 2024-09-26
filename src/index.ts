import { displayMainReliverseMenu } from "~/prompts/00-displayMainReliverseMenu";

async function main() {
  await displayMainReliverseMenu();
}

main().catch((error) => {
  console.error(`An error occurred: ${String(error)}`);
  process.exit(1);
});
