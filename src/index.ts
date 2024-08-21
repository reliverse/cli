import { createProject } from "~/cli/create";

async function main() {
  await createProject();
}

main().catch((error) => {
  console.error(`An error occurred: ${String(error)}`);
  process.exit(1);
});
