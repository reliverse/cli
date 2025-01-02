import type { SimpleGit } from "simple-git";

import { Octokit } from "@octokit/rest";
import fs from "fs-extra";
import path from "pathe";
import { simpleGit } from "simple-git";

import { askGithubName } from "~/app/menu/askGithubName.js";
import { readReliverseMemory } from "~/args/memory/impl.js";
import { relinka } from "~/utils/console.js";

import { createGithubRepo } from "./github.js";

/**
 * Checks if the given directory is a git repository
 * @param dir - Directory to check
 * @returns Promise<boolean> - Whether the directory is a git repository
 */
async function isGitRepo(dir: string): Promise<boolean> {
  try {
    if (!(await fs.pathExists(dir))) {
      relinka("error", `Directory does not exist: ${dir}`);
      return false;
    }

    const gitDir = path.join(dir, ".git");
    if (!(await fs.pathExists(gitDir))) {
      return false;
    }

    const git = simpleGit({ baseDir: dir });
    return await git.checkIsRepo();
  } catch (error) {
    // Only log if it's not a "not a git repo" error
    if (
      !(
        error instanceof Error && error.message.includes("not a git repository")
      )
    ) {
      relinka(
        "error",
        "Error checking git repository:",
        error instanceof Error ? error.message : String(error),
      );
    }
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

/**
 * Checks if the user owns the repository with the given name
 * @param githubUsername - GitHub username
 * @param repoName - Repository name to check
 * @returns Promise<boolean> - Whether the user owns the repository
 */
async function isRepoOwner(
  githubUsername: string,
  repoName: string,
): Promise<boolean> {
  try {
    const memory = await readReliverseMemory();
    if (!memory?.githubKey) {
      relinka("error-verbose", "GitHub token not found in memory");
      return false;
    }

    const octokit = new Octokit({ auth: memory.githubKey });

    try {
      const { data: repo } = await octokit.repos.get({
        owner: githubUsername,
        repo: repoName,
      });

      return repo.permissions?.admin ?? false;
    } catch (error) {
      if (error instanceof Error && error.message.includes("Not Found")) {
        return false;
      }
      throw error;
    }
  } catch (error) {
    relinka(
      "error",
      "Error checking repository ownership:",
      error instanceof Error ? error.message : String(error),
    );
    return false;
  }
}

/**
 * Creates a GitHub repository and sets it up locally
 * @param projectName - Name of the project/repository
 * @param targetDir - Local directory path
 * @returns Promise<boolean> - Whether the operation was successful
 */
export async function createGithubRepository(
  projectName: string,
  targetDir: string,
): Promise<boolean> {
  try {
    const memory = await readReliverseMemory();
    if (!memory) {
      relinka("error", "Failed to read reliverse memory");
      return false;
    }

    const githubUsername = await askGithubName();
    if (!githubUsername) {
      relinka("error", "Could not determine GitHub username");
      return false;
    }

    // Check if repo exists and user owns it
    const repoExists = await isRepoOwner(githubUsername, projectName);

    if (repoExists) {
      const { select } = await import("@clack/prompts");
      const choice = await select({
        message: "This repository already exists. What would you like to do?",
        options: [
          {
            value: "new",
            label: "Initialize a new Git repository with a different name",
          },
          {
            value: "skip",
            label: "Skip git initialization and use the existing repository",
          },
        ],
      });

      if (choice === "new") {
        const { text } = await import("@clack/prompts");
        const newName = await text({
          message: "Enter a new repository name:",
          validate: (value) => {
            if (!value) return "Repository name is required";
            if (!/^[a-zA-Z0-9-_]+$/.test(value))
              return "Invalid repository name format";
            return;
          },
        });

        if (!newName || typeof newName !== "string") {
          relinka("error", "Invalid repository name provided");
          return false;
        }

        return await createGithubRepo(
          memory,
          newName,
          githubUsername,
          targetDir,
        );
      } else if (choice === "skip") {
        // Verify token and setup remote
        if (!memory.githubKey) {
          const { password } = await import("@clack/prompts");
          const token = await password({
            message: "Please provide your GitHub token for pushing commits:",
            validate: (value) => (!value ? "Token is required" : undefined),
          });

          if (!token || typeof token !== "string") {
            relinka("error", "Invalid GitHub token provided");
            return false;
          }

          // Save token to memory
          memory.githubKey = token;
          // TODO: Save updated memory
        }

        // Setup remote for existing repo
        const remoteUrl = `https://github.com/${githubUsername}/${projectName}.git`;
        return await setupGitRemote(targetDir, remoteUrl);
      }

      return false;
    }

    // Create new repository if it doesn't exist
    return await createGithubRepo(
      memory,
      projectName,
      githubUsername,
      targetDir,
    );
  } catch (error) {
    if (error instanceof Error && error.message.includes("already exists")) {
      relinka("error", `Repository '${projectName}' already exists on GitHub`);
    } else {
      relinka(
        "error",
        "Failed to create GitHub repository:",
        error instanceof Error ? error.message : String(error),
      );
    }
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
      relinka(
        "error",
        "Not a git repository, git should be initialized before setupGitRemote. Something went wrong. Please notify developers.",
      );
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
