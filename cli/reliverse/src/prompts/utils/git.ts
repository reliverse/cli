import type { SimpleGit } from "simple-git";

import { consola } from "consola";
import fs from "fs-extra";
import path from "pathe";
import { simpleGit } from "simple-git";

// Initialize Git repository or keep existing .git folder
export async function initializeGitRepository(
  dir: string,
  gitOption: string,
): Promise<void> {
  try {
    if (gitOption === "Initialize new Git repository") {
      const git: SimpleGit = simpleGit({ baseDir: dir });

      await git.init();
      await git.add(".");
      await git.commit("Initial commit from Create Reliverse App");

      console.info("");
      consola.success("Git repository initialized and initial commit created.");

      // consola.info("We recommend pushing your commits using GitHub Desktop.");
      // consola.info(
      //   "Learn more and find other tips by visiting https://reliverse.org.",
      // );
    } else if (
      gitOption ===
      "Keep existing .git folder (for forking later) [🚨 option is under development, may not work]"
    ) {
      if (await fs.pathExists(path.join(dir, ".git"))) {
        consola.info(
          "📂 .git folder has been kept. You can make a fork from this repo later.",
        );
      } else {
        consola.warn("No .git folder found in the template.");
      }
    } else {
      consola.info("No Git initialization performed.");
    }
  } catch (error) {
    consola.warn(
      `🤔 Failed to initialize or manage the Git repository: ${String(error)}`,
    );
  }
}
