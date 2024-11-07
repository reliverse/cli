import { prompts } from "@reliverse/prompts";

import { installDependencies } from "./utils/installDependencies";

async function main() {
  const result = await prompts({
    id: "name",
    type: "text",
    title: "What is your name?",
  });

  await installDependencies();

  console.log(result);
}

await main().catch((error) => {
  console.error("│  An error occurred:\n", error.message);
  console.error(
    "└  Please report this issue at https://github.com/blefnk/reliverse/issues",
  );
  process.exit(1);
});
