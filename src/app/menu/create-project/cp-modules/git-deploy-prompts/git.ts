import type { SimpleGit } from "simple-git";

import { restEndpointMethods } from "@octokit/plugin-rest-endpoint-methods";
import { Octokit } from "@octokit/rest";
import { inputPrompt, selectPrompt } from "@reliverse/prompts";
import fs from "fs-extra";
import path from "pathe";
import pc from "picocolors";
import { simpleGit } from "simple-git";

import { relinka } from "~/app/menu/create-project/cp-modules/cli-main-modules/handlers/logger.js";
import {
  cd,
  getCurrentWorkingDirectory,
  pwd,
} from "~/app/menu/create-project/cp-modules/cli-main-modules/handlers/terminal.js";
import { askGithubName } from "~/app/menu/create-project/cp-modules/cli-main-modules/modules/askGithubName.js";
import { readReliverseMemory } from "~/args/memory/impl.js";

import { commitLocalChanges, createGithubRepo } from "./github.js";

const OctokitWithRest = Octokit.plugin(restEndpointMethods);

/**
 * Checks if the given directory is a git repository
 * @param dir - Directory to check
 * @param isDev - Whether we are in development mode
 * @param projectName - Name of the project (used if isDev = true)
 * @returns Promise<boolean> - Whether the directory is a git repository
 */
export async function isGitRepo(
  dir: string,
  isDev: boolean,
  projectName = "",
): Promise<boolean> {
  const cwd = getCurrentWorkingDirectory();
  const finalDir = isDev ? path.join(cwd, "tests-runtime", projectName) : dir;

  try {
    if (!(await fs.pathExists(finalDir))) {
      relinka("error", `Directory does not exist: ${finalDir}`);
      return false;
    }

    const gitDir = path.join(finalDir, ".git");
    if (!(await fs.pathExists(gitDir))) {
      return false;
    }

    const git = simpleGit({ baseDir: finalDir });
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

/**
 * Initializes a git repository if it doesn't exist, or commits if it does
 * If the repository already exists, it will skip creating a commit.
 * @param dir - Directory to operate in
 * @param isDev - Whether we are in development mode
 * @param projectName - Name of the project (used if isDev = true)
 * @returns Promise<boolean>
 */
export async function initGit(
  dir: string,
  isDev: boolean,
  projectName = "",
): Promise<boolean> {
  const cwd = getCurrentWorkingDirectory();
  const finalDir = isDev ? path.join(cwd, "tests-runtime", projectName) : dir;

  try {
    // Validate directory
    if (!(await fs.pathExists(finalDir))) {
      relinka("error", `Directory does not exist: ${finalDir}`);
      return false;
    }

    const git: SimpleGit = simpleGit({ baseDir: finalDir });
    const isExistingRepo = await isGitRepo(finalDir, isDev, projectName);

    if (!isExistingRepo) {
      // Initialize new git repository
      await git.init();
      relinka("success", "Git repository initialized.");
    } else {
      relinka("info", "Using existing git repository.");
    }

    // Check if there are any files to commit
    const status = await git.status();
    if (status.files.length === 0) {
      if (!isExistingRepo) {
        relinka(
          "info",
          "No files to commit. Creating an empty initial commit.",
        );
        await fs.writeFile(path.join(finalDir, ".gitkeep"), "");
        await git.add(".");
        await git.commit("Initial commit by @reliverse/cli");
      } else {
        relinka("info", "No changes to commit in existing repository.");
      }
    } else {
      // Create commit for changes
      await git.add(".");
      await git.commit(
        isExistingRepo
          ? "Update by @reliverse/cli"
          : "Initial commit by @reliverse/cli",
      );
      relinka(
        "success",
        `${isExistingRepo ? "Changes committed" : "Initial commit created"}.`,
      );
    }

    return true;
  } catch (error) {
    const existingRepo = await isGitRepo(finalDir, isDev, projectName);
    relinka(
      "error",
      `Failed to ${existingRepo ? "update" : "initialize"} git: ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
    relinka(
      "info",
      `You can ${
        existingRepo ? "commit changes" : "initialize git"
      } manually:\ncd ${finalDir}\n${
        existingRepo
          ? 'git add .\ngit commit -m "Update"'
          : 'git init\ngit add .\ngit commit -m "Initial commit"'
      }`,
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
 * @param isDev - Whether we are in development mode
 * @returns Promise<boolean> - Whether the operation was successful
 */
export async function createGithubRepository(
  projectName: string,
  targetDir: string,
  isDev: boolean,
): Promise<boolean> {
  const cwd = getCurrentWorkingDirectory();
  const finalDir = isDev
    ? path.join(cwd, "tests-runtime", projectName)
    : targetDir;

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
      // Change to project directory if in dev mode
      if (isDev) {
        await cd(finalDir);
        pwd();
      }

      // Check for uncommitted changes
      const git = simpleGit({ baseDir: finalDir });
      const status = await git.status();
      const hasChanges = status.files.length > 0;

      // Prompt user for choice: use, use + new commit, init new repo
      const options = [
        {
          value: "commit",
          label: `${pc.greenBright("✅ Recommended")} Use existing repository and create+push new commit`,
        },
        {
          value: "skip",
          label: "Use existing repository, but skip creating a commit",
        },
        {
          value: "new",
          label:
            "Initialize a brand-new GitHub repository with a different name",
        },
      ];

      const choice = await selectPrompt({
        title: `Repository ${githubUsername}/${projectName} already exists and you own it. What would you like to do?`,
        content: `Your project located at ${finalDir}${
          hasChanges ? "\nNote: You have uncommitted changes" : ""
        }`,
        options,
        defaultValue: "commit",
      });

      if (choice === "new") {
        // Prompt for a new repo name
        const newName = await inputPrompt({
          title: "Enter a new repository name:",
          validate: (value: string) => {
            if (!value) return "Repository name is required";
            if (!/^[a-zA-Z0-9-_]+$/.test(value))
              return "Invalid repository name format";
            return true;
          },
        });

        if (!newName || typeof newName !== "string") {
          relinka("error", "Invalid repository name provided");
          return false;
        }

        // Create new GitHub repository
        return await createGithubRepo(
          memory,
          newName,
          githubUsername,
          finalDir,
          isDev,
        );
      } else if (choice === "commit" || choice === "skip") {
        // Remove existing .git directory if it exists
        const gitDir = path.join(finalDir, ".git");
        if (await fs.pathExists(gitDir)) {
          await fs.remove(gitDir);
          relinka("info", "Removed template's .git directory");
        }

        // Initialize git and set up remote
        const git = simpleGit(finalDir);
        await git.init();

        // Use authenticated URL with token as username
        const repoUrl = `https://${memory.githubKey}:x-oauth-basic@github.com/${githubUsername}/${projectName}.git`;
        await git.addRemote("origin", repoUrl);

        // Add all files to git to prevent checkout conflicts
        await git.add(".");
        await git.commit("Initial commit before fetching repository");

        // Fetch the repository
        await git.fetch(["origin", "HEAD"]);

        // Force checkout to handle any conflicts
        await git.raw(["checkout", "FETCH_HEAD", "-f"]);

        relinka("success", "Retrieved repository git data");

        if (choice === "commit" && hasChanges) {
          // Create Octokit instance with GitHub token
          const githubOctokit = new OctokitWithRest({
            auth: memory.githubKey,
            userAgent: "reliverse-cli/1.4.15",
          });

          // Create and push commit using GitHub API
          const success = await commitLocalChanges({
            octokit: githubOctokit,
            owner: githubUsername,
            repo: projectName,
            directory: finalDir,
            changedFiles: status.files.map((file) => file.path),
          });

          if (success) {
            relinka("success", "Created and pushed new commit with changes");
          }
          return success;
        }
        return true;
      }
    }

    // If repo does not exist, create new repository
    return await createGithubRepo(
      memory,
      projectName,
      githubUsername,
      finalDir,
      isDev,
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

/**
 * Sets up a remote for an existing local git repository and pushes the initial commit
 * @param dir - Local directory path
 * @param remoteUrl - Remote URL to use
 * @param remoteName - (Optional) name for the remote
 * @param isDev - Whether we are in development mode
 * @param projectName - Name of the project (used if isDev = true)
 * @returns Promise<boolean>
 */
export async function setupGitRemote(
  isDev: boolean,
  projectName: string,
  dir: string,
  remoteUrl: string,
  remoteName = "origin",
): Promise<boolean> {
  const cwd = getCurrentWorkingDirectory();
  const finalDir = isDev ? path.join(cwd, "tests-runtime", projectName) : dir;

  try {
    // Validate directory and git repo
    if (!(await fs.pathExists(finalDir))) {
      relinka("error", `Directory does not exist: ${finalDir}`);
      return false;
    }

    if (!(await isGitRepo(finalDir, isDev, projectName))) {
      relinka(
        "error",
        "Not a git repository, git should be initialized before setupGitRemote. Something went wrong. Please notify developers.",
      );
      return false;
    }

    const git = simpleGit({ baseDir: finalDir });
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

    // Push initial commit (if any) — sets upstream if it hasn’t been set
    await git.push(remoteName, "main", ["--set-upstream"]);
    relinka("success", "Initial commit pushed to remote repository.");

    return true;
  } catch (error) {
    relinka(
      "error",
      `Failed to setup git remote: ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
    relinka(
      "info",
      `You can setup the remote manually:\ncd ${finalDir}\ngit remote add ${remoteName} ${remoteUrl}\ngit push -u ${remoteName} main`,
    );
    return false;
  }
}

/**
 * Creates a new local commit with the specified message
 * @param message - Commit message
 * @param projectPath - Project directory
 * @param isDev - Whether we are in development mode
 * @param projectName - Name of the project (used if isDev = true)
 * @returns Promise<boolean>
 */
export async function createGitCommit(
  message: string,
  projectPath: string,
  isDev: boolean,
  projectName: string,
): Promise<boolean> {
  const cwd = getCurrentWorkingDirectory();
  const finalDir = isDev
    ? path.join(cwd, "tests-runtime", projectName)
    : projectPath;

  try {
    if (!(await isGitRepo(finalDir, isDev, projectName))) {
      relinka("error", "Not a git repository. Please initialize git first.");
      return false;
    }

    const git = simpleGit({ baseDir: finalDir });
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
    relinka(
      "error",
      `Failed to create commit: ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
    return false;
  }
}

/**
 * Pushes local commits to the remote
 * @param projectPath - Project directory
 * @param isDev - Whether we are in development mode
 * @param projectName - Name of the project (used if isDev = true)
 * @returns Promise<boolean>
 */
export async function pushGitCommits(
  projectPath: string,
  isDev: boolean,
  projectName: string,
): Promise<boolean> {
  const cwd = getCurrentWorkingDirectory();
  const finalDir = isDev
    ? path.join(cwd, "tests-runtime", projectName)
    : projectPath;

  try {
    if (!(await isGitRepo(finalDir, isDev, projectName))) {
      relinka("error", "Not a git repository. Please initialize git first.");
      return false;
    }

    const git = simpleGit({ baseDir: finalDir });

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
    relinka(
      "error",
      `Failed to push commits: ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
    return false;
  }
}
