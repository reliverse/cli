import { anykeyPrompt } from "@reliverse/prompts";
import pc from "picocolors";

import { pm } from "~/utils/pkg.js";

export async function showAnykeyPrompt(
  kind: "welcome" | "pm" | "privacy",
  username?: string,
) {
  let notification = pc.bold("Press any key to continue...");

  if (kind === "welcome") {
    notification = `👋 Hello, my name is Reliverse!\n│  🤖 I'm your assistant for creating new web projects and making advanced codebase modifications automatically.\n│  ✨ I'm constantly evolving, with more features on the way.\n│  ============================\n│  ${notification}`;
  }

  if (kind === "privacy") {
    notification = `🤖 Before we proceed, let me share something important:\n│  I may collect minimal data about your projects, such as their name, to help me remember your preferences and provide smarter, more personalized suggestions.\n│  Rest assured, your data will be used solely to enhance your experience with me, and I won't share it with anyone. If you wish, you can choose to share some data with other users.\n│  If you'd prefer not to allow any data collection, you can always run me with the '--nodata' option (please note that authentication is still required). Keep in mind that this may limit my capabilities.\n│  ============================\n│  ${notification}`;
  }

  if (kind === "pm" && pm === "bun" && username) {
    notification += `\n│  ============================\n│  Hey ${username}, a quick tip from me: Bun might crash if you press Enter while setTimeout\n│  is running. Please avoid doing that in the upcoming prompts! 😅`;
  }

  await anykeyPrompt(notification);
}
