import type { SimpleGit } from "simple-git";

import { inputPrompt, selectPrompt } from "@reliverse/prompts";
import fs from "fs-extra";
import path from "pathe";
import pc from "picocolors";
import { simpleGit } from "simple-git";

import type { ReliverseMemory } from "~/types.js";

import { askGithubName } from "~/app/menu/create-project/cp-modules/cli-main-modules/modules/askGithubName.js";
import { relinka } from "~/utils/loggerRelinka.js";
import { cd, pwd } from "~/utils/terminalHelpers.js";

import { checkGithubRepoOwnership, createGithubRepo } from "./github.js";
import { createOctokitInstance } from "./octokit-instance.js";
import { cloneToTempAndCopyFiles, isGitRepo } from "./utils-git-github.js";

/**
 * Initializes a git repository if it doesn't exist, or commits if it does
 * If the repository already exists, it will skip creating a commit.
 */
export async function initGit(
  cwd: string,
  isDev: boolean,
  projectPath: string,
  projectName: string,
): Promise<boolean> {
  const finalDir = isDev
    ? path.join(cwd, "tests-runtime", projectName)
    : projectPath;

  try {
    // Validate directory
    if (!(await fs.pathExists(finalDir))) {
      relinka("error", `Directory does not exist: ${finalDir}`);
      return false;
    }

    const git: SimpleGit = simpleGit({ baseDir: finalDir });
    const isExistingRepo = await isGitRepo(
      cwd,
      isDev,
      projectName,
      projectPath,
    );

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
    const existingRepo = await isGitRepo(cwd, isDev, projectName, projectPath);
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
 */
async function isRepoOwner(
  githubUsername: string,
  repoName: string,
  memory: ReliverseMemory,
): Promise<boolean> {
  try {
    if (!memory?.githubKey) {
      relinka("error-verbose", "GitHub token not found in memory");
      return false;
    }

    const octokit = createOctokitInstance(memory.githubKey);
    const { isOwner } = await checkGithubRepoOwnership(
      octokit,
      githubUsername,
      repoName,
    );
    return isOwner;
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
 */
export async function createGithubRepository(
  cwd: string,
  isDev: boolean,
  memory: ReliverseMemory,
  projectName: string,
  projectPath: string,
): Promise<boolean> {
  const finalDir = isDev
    ? path.join(cwd, "tests-runtime", projectName)
    : projectPath;

  try {
    if (!memory) {
      relinka("error", "Failed to read reliverse memory");
      return false;
    }

    const githubUsername = await askGithubName(memory);
    if (!githubUsername) {
      relinka("error", "Could not determine GitHub username");
      return false;
    }

    // Check if repo exists and user owns it
    const repoExists = await isRepoOwner(githubUsername, projectName, memory);

    if (repoExists) {
      // Change to project directory if in dev mode
      if (isDev) {
        await cd(finalDir);
        pwd();
      }

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
        content:
          "Note: A commit will be created and pushed only if you have uncommitted changes.",
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
          cwd,
        );
      } else if (choice === "commit" || choice === "skip") {
        // Use authenticated URL with token as username
        const repoUrl = `https://oauth2:${memory.githubKey}@github.com/${githubUsername}/${projectName}.git`;

        // Clone repo to temp dir and copy files
        const success = await cloneToTempAndCopyFiles(repoUrl, finalDir);
        if (!success) {
          throw new Error("Failed to retrieve repository data");
        }

        relinka("success", "Retrieved repository git data");

        if (choice === "commit") {
          // Create Octokit instance with GitHub token
          if (!memory.githubKey) {
            throw new Error("GitHub token not found");
          }

          // Add and commit all files in the working directory
          const git = simpleGit({ baseDir: finalDir });
          await git.add(".");
          await git.commit("Update by @reliverse/cli");

          // Get the latest commit details
          const latestCommit = await git.log({ maxCount: 1 });
          if (!latestCommit.latest) {
            throw new Error("Failed to get latest commit");
          }

          // Push the commit
          try {
            await git.push("origin", "main");
            relinka("success", "Created and pushed new commit with changes");
            return true;
          } catch (error) {
            relinka(
              "error",
              "Failed to push commit:",
              error instanceof Error ? error.message : String(error),
            );
            return false;
          }
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
      cwd,
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
 * Creates a new local commit with the specified message
 */
export async function createGitCommit(
  cwd: string,
  isDev: boolean,
  projectName: string,
  projectPath: string,
  message: string,
): Promise<boolean> {
  const finalDir = isDev
    ? path.join(cwd, "tests-runtime", projectName)
    : projectPath;

  try {
    if (!(await isGitRepo(cwd, isDev, projectName, projectPath))) {
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
 */
export async function pushGitCommits(
  cwd: string,
  isDev: boolean,
  projectName: string,
  projectPath: string,
): Promise<boolean> {
  const finalDir = isDev
    ? path.join(cwd, "tests-runtime", projectName)
    : projectPath;

  try {
    if (!(await isGitRepo(cwd, isDev, projectName, projectPath))) {
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
