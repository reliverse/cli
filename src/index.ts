import { createProject } from "~/cli/createProject";

async function main() {
  await createProject();
}

main().catch((error) => {
  console.error(`An error occurred: ${String(error)}`);
  process.exit(1);
});
