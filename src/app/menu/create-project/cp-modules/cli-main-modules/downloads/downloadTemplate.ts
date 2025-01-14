import { spinnerTaskPrompt } from "@reliverse/prompts";

import type { TemplateOption } from "~/utils/projectTemplate.js";

import { downloadGitRepo } from "./downloadGitRepo.js";

export async function downloadTemplate({
  webProjectTemplate,
  projectName,
  isDev,
  cwd,
}: {
  webProjectTemplate: TemplateOption;
  projectName: string;
  isDev: boolean;
  cwd: string;
}) {
  let projectPath = "";
  await spinnerTaskPrompt({
    spinnerSolution: "ora",
    initialMessage: `Downloading template ${webProjectTemplate}...`,
    successMessage: "✅ Template downloaded successfully!",
    errorMessage: "❌ Failed to download template...",
    async action(updateMessage: (message: string) => void) {
      const dir = await downloadGitRepo(
        projectName,
        webProjectTemplate,
        isDev,
        cwd,
      );
      if (!dir) {
        throw new Error("Failed to create target directory");
      }
      projectPath = dir;
      updateMessage("Some magic is happening... This may take a while...");
    },
  });
  return projectPath;
}
