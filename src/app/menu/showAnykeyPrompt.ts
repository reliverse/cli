import { anykeyPrompt } from "@reliverse/prompts";
import pc from "picocolors";

export async function showAnykeyPrompt() {
  const notification = `🤖 Hello, my name is Reliverse! I'm your assistant for creating new web projects, integrating new features, and making advanced codebase modifications. ✨ I'm constantly evolving, with even more features on the way! In the future, I'll be able to work with not only web apps. Let's get started!\n│  ============================\n│  ${pc.bold("Press any key to continue...")}`;

  await anykeyPrompt(notification);
}
