import { setupProject } from "~/utils/setup";

async function main() {
  await setupProject();
}

main().catch((error) => {
  console.error(`An error occurred: ${String(error)}`);
  process.exit(1);
});
