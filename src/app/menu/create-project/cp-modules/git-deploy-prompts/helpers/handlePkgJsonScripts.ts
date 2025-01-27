import { selectPrompt } from "@reliverse/prompts";
import { relinka } from "@reliverse/prompts";
import { execa } from "execa";
import { installDependencies } from "nypm";

export async function ensureDbInitialized(
  hasDbPush: boolean,
  shouldRunDbPush: boolean,
  shouldInstallDeps: boolean,
  projectPath: string,
): Promise<"success" | "skip" | "cancel"> {
  // If db:push is not available or already run, proceed
  if (!hasDbPush || shouldRunDbPush) {
    return "success";
  }

  const choice = await selectPrompt({
    title:
      "You project has `db:push` script, it is recommended to run it before deploying. Without initializing, your production build may crash.\n✅ It is safe to skip if you have already run it before.",
    content: !shouldInstallDeps
      ? "This requires dependencies to be installed."
      : "",
    options: [
      {
        label: !shouldInstallDeps
          ? "Install dependencies, run `db:push`, and deploy"
          : "Run `db:push` to initialize database",
        value: "yes",
      },
      {
        label: "Deploy without running `db:push`",
        value: "skip",
        hint: "not recommended",
      },
      { label: "Cancel deployment process", value: "cancel" },
    ],
    defaultValue: "yes",
  });

  if (choice === "cancel") {
    return "cancel";
  }

  if (choice === "skip") {
    relinka("warn", "Proceeding without running `db:push`...");
    return "skip";
  }

  try {
    if (!shouldInstallDeps) {
      await installDependencies({
        cwd: projectPath,
      });
    }

    await execa("bun", ["db:push"], {
      cwd: projectPath,
      stdio: "inherit",
    });
    return "success";
  } catch (error) {
    relinka(
      "error",
      "Error running `bun db:push`:",
      error instanceof Error ? error.message : String(error),
    );
    return "cancel";
  }
}
