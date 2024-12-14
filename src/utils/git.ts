import type { SimpleGit } from "simple-git";

import fs from "fs-extra";
import path from "pathe";
import { simpleGit } from "simple-git";

import type { GitOption } from "~/app/menu/askGitInitialization.js";

import { relinka } from "~/utils/console.js";

// Initialize Git repository or keep existing .git folder
export async function initializeGitRepository(
  dir: string,
  gitOption: GitOption,
): Promise<void> {
  try {
    if (gitOption === "initializeNewGitRepository") {
      await fs.remove(path.join(dir, ".git"));

      const git: SimpleGit = simpleGit({ baseDir: dir });
      await git.init();
      await git.add(".");
      await git.commit("Initial commit by @reliverse/cli");

      relinka(
        "success",
        "Git repository initialized and initial commit created.",
      );
    } else if (gitOption === "keepExistingGitFolder") {
      if (await fs.pathExists(path.join(dir, ".git"))) {
        relinka(
          "success",
          ".git folder has been kept. You can make a fork from this repo later.",
        );
      } else {
        relinka("error", "No .git folder found in the template.");
      }
    } else {
      relinka("success", "No Git initialization performed.");
    }
  } catch (error) {
    relinka(
      "info",
      `🤔 Hmm, I'm sorry but I failed to initialize the .git folder... You can create it manually, just 'cd ${dir}' and run 'git init'`,
    );
    relinka("error-verbose", `⚙️  ${String(error)}`);
  }

  relinka(
    "info",
    "By the way, I recommend using GitHub Desktop to push your commits later:",
    `"Add local repository" -> Paste: ${dir}\nLearn more and find other tips by visiting https://docs.reliverse.org`,
  );
}
