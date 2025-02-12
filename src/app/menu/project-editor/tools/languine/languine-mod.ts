import { relinka } from "@reliverse/prompts";

export async function translateProjectUsingLanguine(projectPath: string) {
  relinka("info", "Translating project...");
  relinka("info-verbose", `Using: ${projectPath}`);
}
