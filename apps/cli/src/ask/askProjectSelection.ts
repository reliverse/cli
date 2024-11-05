import { selectWithConfig } from "~/utils/promptsUtils";
import { outro } from "@clack/prompts";
import color from "picocolors";
import { projectKinds } from "~/prompts";
import { title } from "~/utils/generalUtils";

export async function askProjectSelection(): Promise<string | undefined> {
  const kind = await selectWithConfig(
    title("What would you like to work on today?"),
    projectKinds,
    5,
  );

  if (kind === "exit") {
    outro(color.inverse(color.bold(" https://discord.gg/Pb8uKbwpsJ ")));
    return;
  }

  if (projectKinds.some((pk) => pk.value === kind && pk.disabled)) {
    console.log(color.dim("│"));
    console.log(
      color.red(
        "│  This kind of project is still under development. Please check back later.\n│  At the moment, you can only create and modify Next.js web apps codebases.",
      ),
    );
    outro(color.inverse(color.bold(" https://discord.gg/Pb8uKbwpsJ ")));
    return;
  }

  return kind;
}
