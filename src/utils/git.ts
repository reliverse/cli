import type { SimpleGit } from "simple-git";

import { execa } from "execa";
import fs from "fs-extra";
import path from "pathe";
import { simpleGit } from "simple-git";

import type { GitOption } from "~/types.js";

import { relinka } from "~/utils/console.js";

export async function createGitCommit({
  message,
  projectPath,
}: {
  message: string;
  projectPath: string;
}): Promise<boolean> {
  try {
    // Stage all changes
    await execa("git add .", { cwd: projectPath });

    // Create the commit
    await execa(`git commit -m "${message}"`, { cwd: projectPath });

    return true;
  } catch (error) {
    relinka("error", `Failed to create commit: ${(error as Error).message}`);
    return false;
  }
}

export async function pushGitCommits(projectPath: string): Promise<boolean> {
  try {
    // Get current branch name
    const { stdout: branchName } = await execa(
      "git rev-parse --abbrev-ref HEAD",
      { cwd: projectPath },
    );

    // Push to remote
    await execa(`git push origin ${branchName.trim()}`, {
      cwd: projectPath,
    });

    return true;
  } catch (error) {
    relinka("error", `Failed to push commits: ${(error as Error).message}`);
    return false;
  }
}

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
