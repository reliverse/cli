import { spinnerTaskPrompt } from "@reliverse/prompts";

import type { TemplateOption } from "~/types.js";

import { downloadGitRepo } from "./downloadGitRepo.js";

export async function downloadTemplate(
  webProjectTemplate: TemplateOption,
  projectName: string,
  isDev: boolean,
) {
  let targetDir = "";
  await spinnerTaskPrompt({
    spinnerSolution: "ora",
    initialMessage: `Downloading template ${webProjectTemplate}...`,
    successMessage: "✅ Template downloaded successfully!",
    errorMessage: "❌ Failed to download template...",
    async action(updateMessage: (message: string) => void) {
      const dir = await downloadGitRepo(projectName, webProjectTemplate, isDev);
      if (!dir) {
        throw new Error("Failed to create target directory");
      }
      targetDir = dir;
      updateMessage("Some magic is happening... This may take a while...");
    },
  });
  return targetDir;
}
