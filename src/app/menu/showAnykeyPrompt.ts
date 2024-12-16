import { anykeyPrompt } from "@reliverse/prompts";
import pc from "picocolors";

export async function showAnykeyPrompt() {
  const notification = `👋 Hello, my name is Reliverse!\n│  🤖 I'm your assistant for creating new web projects, integrating new features, and making advanced codebase modifications.\n│  ✨ I'm constantly evolving, with even more features on the way! In the future, I'll be able to work with not only web apps.\n│  ============================\n│  ${pc.bold("Press any key to continue...")}`;

  await anykeyPrompt(notification);
}
