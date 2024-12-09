import type { SimpleGit } from "simple-git";

import { msg } from "@reliverse/prompts";
import { relinka } from "@reliverse/relinka";
import fs from "fs-extra";
import path from "pathe";
import pc from "picocolors";
import { simpleGit } from "simple-git";

import type { GitOption } from "~/app/menu/askGitInitialization.js";

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

      relinka.success(
        pc.cyanBright(
          " 📂 Git repository initialized and initial commit created.",
        ),
      );

      relinka.info(
        pc.dim(" I recommend pushing your commits using GitHub Desktop:"),
      );
      relinka.info(
        `${pc.dim(` "Add local repository" -> Paste:`)} ${pc.cyan(dir)}`,
      );
      relinka.info(
        pc.dim(
          " Learn more and find other tips by visiting https://docs.reliverse.org",
        ),
      );
    } else if (gitOption === "keepExistingGitFolder") {
      if (await fs.pathExists(path.join(dir, ".git"))) {
        relinka.success(
          pc.dim(
            " .git folder has been kept. You can make a fork from this repo later.",
          ),
        );
      } else {
        relinka.warn(pc.dim("  No .git folder found in the template."));
      }
    } else {
      relinka.success(pc.dim(" No Git initialization performed."));
    }
    msg({
      type: "M_MIDDLE",
    });
  } catch (error) {
    relinka.warn(
      `🤔 Failed to initialize or manage the Git repository: ${String(error)}`,
    );
  }
}
