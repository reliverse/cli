import { deleteLastLine, msg } from "@reliverse/prompts";
import { execa } from "execa";

import { relinka } from "~/utils/console.js";

export async function ghLogin() {
  relinka("info", "GitHub CLI requires authentication. Running login...");
  deleteLastLine();
  try {
    await execa("gh", ["config", "set", "prompt", "disabled"]);
    await execa("gh", ["auth", "login"], {
      stdio: "inherit",
    });
    await execa("gh", ["config", "set", "prompt", "enabled"]);
    msg({ type: "M_MIDDLE" });
  } catch (loginError: unknown) {
    relinka(
      "error",
      "Failed to authenticate with GitHub CLI:",
      loginError instanceof Error ? loginError.message : String(loginError),
    );
    return;
  }
}
