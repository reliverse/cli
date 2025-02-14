import { relinka } from "@reliverse/prompts";
import { execaCommand } from "execa";
import { lookpath } from "lookpath";

async function isLanguineInstalled() {
  const commandPath = await lookpath("languine");
  return commandPath !== undefined;
}

export async function useAddonLanguine(projectPath: string) {
  relinka("info-verbose", `Using: ${projectPath}`);

  if (!(await isLanguineInstalled())) {
    relinka("info", "Installing the translation addon...");
    await execaCommand("bun add -g languine", { stdio: "inherit" });
  }

  relinka(
    "success",
    "Please execute the following command: `languine`",
    "Note: This addon must currently be run manually.",
  );
}
