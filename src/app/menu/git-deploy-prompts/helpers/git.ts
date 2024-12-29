import type { SimpleGit } from "simple-git";

import fs from "fs-extra";
import path from "pathe";
import { simpleGit } from "simple-git";

import type { ReliverseConfig } from "~/types.js";

import { readReliverseMemory } from "~/args/memory/impl.js";
import { relinka } from "~/utils/console.js";

import { createGithubRepo } from "./github.js";

async function isGitRepo(dir: string): Promise<boolean> {
  try {
    const git = simpleGit({ baseDir: dir });
    return await git.checkIsRepo();
  } catch {
    return false;
  }
}

export async function initGit(dir: string): Promise<boolean> {
  try {
    // Validate directory
    if (!(await fs.pathExists(dir))) {
      relinka("error", `Directory does not exist: ${dir}`);
      return false;
    }

    // Check if git is already initialized
    if (await isGitRepo(dir)) {
      relinka("info", "Git repository already initialized.");
      return true;
    }

    // Clean any partial .git directory
    const gitDir = path.join(dir, ".git");
    if (await fs.pathExists(gitDir)) {
      await fs.remove(gitDir);
    }

    // Initialize git
    const git: SimpleGit = simpleGit({ baseDir: dir });
    await git.init();

    // Check if there are any files to commit
    const status = await git.status();
    if (status.files.length === 0) {
      relinka("info", "No files to commit. Creating an empty initial commit.");
      await fs.writeFile(path.join(dir, ".gitkeep"), "");
    }

    // Initial commit
    await git.add(".");
    await git.commit("Initial commit by @reliverse/cli");
    relinka(
      "success",
      "Git repository initialized and initial commit created.",
    );

    return true;
  } catch (error) {
    relinka("error", `Failed to initialize git: ${(error as Error).message}`);
    relinka(
      "info",
      `You can initialize git manually:\ncd ${dir}\ngit init\ngit add .\ngit commit -m "Initial commit"`,
    );
    return false;
  }
}

export async function createRepo(
  projectName: string,
  targetDir: string,
  config: ReliverseConfig,
): Promise<boolean> {
  try {
    const shouldUseDataFromConfig =
      config?.experimental?.skipPromptsUseAutoBehavior ?? false;
    const memory = await readReliverseMemory();
    if (!memory) {
      relinka("error", "Failed to read reliverse memory");
      return false;
    }

    // Import askGithubName dynamically to avoid circular dependencies
    const { askGithubName } = await import("~/app/menu/askGithubName.js");
    const githubUsername =
      shouldUseDataFromConfig && memory.githubUsername
        ? memory.githubUsername
        : await askGithubName();

    return await createGithubRepo(
      memory,
      projectName,
      githubUsername,
      targetDir,
    );
  } catch (error) {
    relinka(
      "error",
      "Error creating GitHub repository:",
      error instanceof Error ? error.message : String(error),
    );
    return false;
  }
}

export async function setupGitRemote(
  dir: string,
  remoteUrl: string,
  remoteName = "origin",
): Promise<boolean> {
  try {
    // Validate directory and git repo
    if (!(await fs.pathExists(dir))) {
      relinka("error", `Directory does not exist: ${dir}`);
      return false;
    }

    if (!(await isGitRepo(dir))) {
      relinka("error", "Not a git repository. Please initialize git first.");
      return false;
    }

    const git = simpleGit({ baseDir: dir });
    const remotes = await git.getRemotes();

    // Setup remote
    if (!remotes.find((remote) => remote.name === remoteName)) {
      await git.addRemote(remoteName, remoteUrl);
      relinka("success", `Remote '${remoteName}' added successfully.`);
    } else {
      // Update existing remote URL if different
      const remoteGetUrl = await git.remote(["get-url", remoteName]);
      const existingUrl = remoteGetUrl ? remoteGetUrl.trim() : "";

      if (existingUrl !== remoteUrl) {
        await git.remote(["set-url", remoteName, remoteUrl]);
        relinka("info", `Updated ${remoteName} remote URL to ${remoteUrl}`);
      } else {
        relinka(
          "info",
          `Remote '${remoteName}' already exists with correct URL.`,
        );
      }
    }

    // Push initial commit
    await git.push(remoteName, "main", ["--set-upstream"]);
    relinka("success", "Initial commit pushed to remote repository.");

    return true;
  } catch (error) {
    relinka("error", `Failed to setup git remote: ${(error as Error).message}`);
    relinka(
      "info",
      `You can setup the remote manually:\ncd ${dir}\ngit remote add ${remoteName} ${remoteUrl}\ngit push -u ${remoteName} main`,
    );
    return false;
  }
}

export async function createGitCommit({
  message,
  projectPath,
}: {
  message: string;
  projectPath: string;
}): Promise<boolean> {
  try {
    if (!(await isGitRepo(projectPath))) {
      relinka("error", "Not a git repository. Please initialize git first.");
      return false;
    }

    const git = simpleGit({ baseDir: projectPath });
    const status = await git.status();

    if (status.files.length === 0) {
      relinka("info", "No changes to commit.");
      return true;
    }

    await git.add(".");
    await git.commit(message);
    relinka("success", `Created commit: ${message}`);

    return true;
  } catch (error) {
    relinka("error", `Failed to create commit: ${(error as Error).message}`);
    return false;
  }
}

export async function pushGitCommits(projectPath: string): Promise<boolean> {
  try {
    if (!(await isGitRepo(projectPath))) {
      relinka("error", "Not a git repository. Please initialize git first.");
      return false;
    }

    const git = simpleGit({ baseDir: projectPath });

    // Get current branch
    const currentBranch = (await git.branch()).current;
    if (!currentBranch) {
      relinka("error", "No current branch found.");
      return false;
    }

    // Check if there are commits to push
    const status = await git.status();
    if (status.ahead === 0) {
      relinka("info", "No commits to push.");
      return true;
    }

    await git.push("origin", currentBranch);
    relinka(
      "success",
      `Pushed ${status.ahead} commit(s) to origin/${currentBranch}`,
    );

    return true;
  } catch (error) {
    relinka("error", `Failed to push commits: ${(error as Error).message}`);
    return false;
  }
}
