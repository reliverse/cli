import { confirmPrompt } from "@reliverse/prompts";

export async function askMaskInput() {
  return await confirmPrompt({
    title:
      "Do you want to mask secret inputs (e.g., GitHub token) in the next steps?",
    content:
      "Regardless of your choice, your data will be securely stored on your device.",
  });
}
