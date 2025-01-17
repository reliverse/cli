import type { SimpleGit } from "simple-git";

import { inputPrompt, selectPrompt } from "@reliverse/prompts";
import { deleteLastLine, relinka } from "@reliverse/relinka";
import fs from "fs-extra";
import path from "pathe";
import pc from "picocolors";
import { simpleGit } from "simple-git";

import type { ReliverseConfig } from "~/utils/schemaConfig.js";
import type { ReliverseMemory } from "~/utils/schemaMemory.js";

import { cliName } from "~/app/constants.js";
import { cd, pwd } from "~/utils/terminalHelpers.js";

import { checkGithubRepoOwnership, createGithubRepo } from "./github.js";
import { createOctokitInstance } from "./octokit-instance.js";
import { isDirHasGit } from "./utils-git-github.js";

/* -----------------------------------------------------------------------------
 * Types
 * -------------------------------------------------------------------------- */

type GitOptions = {
  cwd: string;
  isDev: boolean;
  projectPath: string;
  projectName: string;
};

/* -----------------------------------------------------------------------------
 * Utility Functions
 * -------------------------------------------------------------------------- */

/**
 * Gets the effective directory path based on dev mode and project settings
 */
function getEffectiveDir({
  cwd,
  isDev,
  projectPath,
  projectName,
}: GitOptions): string {
  return isDev ? path.join(cwd, "tests-runtime", projectName) : projectPath;
}

/**
 * Validates that the project directory exists
 */
async function validateProjectDir(effectiveDir: string): Promise<boolean> {
  if (!(await fs.pathExists(effectiveDir))) {
    relinka("error", `Project directory does not exist: ${effectiveDir}`);
    return false;
  }
  return true;
}

/* -----------------------------------------------------------------------------
 * Git Core Operations
 * -------------------------------------------------------------------------- */

/**
 * Removes the .git directory from a project
 */
async function removeGitDir(effectiveDir: string): Promise<boolean> {
  try {
    await fs.remove(path.join(effectiveDir, ".git"));
    relinka("info", "Removed existing .git directory");
    return true;
  } catch (error) {
    relinka(
      "error",
      "Failed to remove existing .git directory:",
      error instanceof Error ? error.message : String(error),
    );
    return false;
  }
}

/**
 * Initializes git repository and sets default branch
 */
async function initializeGitRepo(
  git: SimpleGit,
  dirHasGit: boolean,
): Promise<void> {
  if (!dirHasGit) {
    await git.init();
    relinka("success", "Git directory initialized");

    try {
      await git.raw(["branch", "-M", "main"]);
    } catch (error) {
      relinka(
        "warn",
        "Failed to rename default branch to main:",
        error instanceof Error ? error.message : String(error),
      );
    }
  } else {
    relinka("info", "Using existing git repository");
  }
}

/**
 * Creates a commit with the current changes
 */
async function createGitCommit(
  git: SimpleGit,
  effectiveDir: string,
  dirHasGit: boolean,
  message?: string,
): Promise<void> {
  const status = await git.status();

  if (status.files.length === 0 && !dirHasGit) {
    relinka("info", "No files to commit. Creating an empty initial commit");
    await fs.writeFile(path.join(effectiveDir, ".gitkeep"), "");
    await git.add(".gitkeep");
    await git.commit(message ?? `Initial commit by ${cliName}`);
    relinka("success", "Created empty initial commit");
  } else if (status.files.length > 0) {
    await git.add(".");
    await git.commit(
      message ??
        (dirHasGit ? `Update by ${cliName}` : `Initial commit by ${cliName}`),
    );
    relinka(
      "success",
      dirHasGit ? "Changes committed" : "Initial commit created",
    );
  } else {
    relinka("info", "No changes to commit in existing repository");
  }
}

/* -----------------------------------------------------------------------------
 * Git Repository Management
 * -------------------------------------------------------------------------- */

/**
 * Initializes a git repository if it doesn't exist, or commits if it does.
 * If allowReInit is true and repository exists, it will be reinitialized.
 */
export async function initGitDir(
  options: GitOptions & { allowReInit?: boolean },
): Promise<boolean> {
  const effectiveDir = getEffectiveDir(options);

  try {
    // 1. Validate directory
    if (!(await validateProjectDir(effectiveDir))) {
      return false;
    }

    // 2. Check if it's already a git repo
    const dirHasGit = await isDirHasGit(
      options.cwd,
      options.isDev,
      options.projectName,
      options.projectPath,
    );

    // 3. Handle reinitialization if needed
    if (dirHasGit && options.allowReInit) {
      deleteLastLine(); // Deletes the "GET /repos/repoOwner/repoName - 404 ..." line
      relinka("info", "Reinitializing existing git repository");
      if (!(await removeGitDir(effectiveDir))) {
        return false;
      }
      const git: SimpleGit = simpleGit({ baseDir: effectiveDir });
      await initializeGitRepo(git, false);
      await createGitCommit(git, effectiveDir, false);
      return true;
    }

    // 4. Initialize git directory if needed
    const git: SimpleGit = simpleGit({ baseDir: effectiveDir });
    await initializeGitRepo(git, dirHasGit);

    // 5. Create initial commit if needed
    await createGitCommit(git, effectiveDir, dirHasGit);

    return true;
  } catch (error) {
    const existingRepo = await isDirHasGit(
      options.cwd,
      options.isDev,
      options.projectName,
      options.projectPath,
    );
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
      } manually:\ncd ${effectiveDir}\n${
        existingRepo
          ? 'git add .\ngit commit -m "Update"'
          : 'git init\ngit add .\ngit commit -m "Initial commit"'
      }`,
    );
    return false;
  }
}

/**
 * Creates a commit with the current changes in the repository.
 * Will initialize the repository if it doesn't exist.
 */
export async function createCommit(
  options: GitOptions & { message?: string },
): Promise<boolean> {
  const effectiveDir = getEffectiveDir(options);

  try {
    // 1. Validate directory
    if (!(await validateProjectDir(effectiveDir))) {
      return false;
    }

    // 2. Check if it's already a git repo
    const dirHasGit = await isDirHasGit(
      options.cwd,
      options.isDev,
      options.projectName,
      options.projectPath,
    );

    // 3. Initialize git directory if needed
    const git: SimpleGit = simpleGit({ baseDir: effectiveDir });
    await initializeGitRepo(git, dirHasGit);

    // 4. Create commit with specified message
    await createGitCommit(git, effectiveDir, dirHasGit, options.message);

    return true;
  } catch (error) {
    const existingRepo = await isDirHasGit(
      options.cwd,
      options.isDev,
      options.projectName,
      options.projectPath,
    );
    relinka(
      "error",
      `Failed to ${existingRepo ? "create commit" : "initialize"} git: ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
    relinka(
      "info",
      `You can ${
        existingRepo ? "commit changes" : "initialize git"
      } manually:\ncd ${effectiveDir}\n${
        existingRepo
          ? 'git add .\ngit commit -m "Update"'
          : 'git init\ngit add .\ngit commit -m "Initial commit"'
      }`,
    );
    return false;
  }
}

/* -----------------------------------------------------------------------------
 * GitHub Integration
 * -------------------------------------------------------------------------- */

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
  options: GitOptions & {
    skipPrompts: boolean;
    memory: ReliverseMemory;
    config: ReliverseConfig;
    shouldMaskSecretInput: boolean;
    githubUsername: string;
  },
): Promise<boolean> {
  const effectiveDir = getEffectiveDir(options);

  try {
    if (!options.memory) {
      relinka("error", "Failed to read reliverse memory");
      return false;
    }

    if (!options.githubUsername) {
      relinka("error", "Could not determine GitHub username");
      return false;
    }

    // Check if repo exists and user owns it
    const repoExists = await isRepoOwner(
      options.githubUsername,
      options.projectName,
      options.memory,
    );

    if (repoExists) {
      if (options.isDev) {
        await cd(effectiveDir);
        pwd();
      }

      // Decide what to do with existing repo
      let choice = "commit";
      const alreadyExistsDecision = options.config.existingRepoBehavior;
      if (options.skipPrompts) {
        switch (alreadyExistsDecision) {
          case "autoYes":
            choice = "commit";
            break;
          case "autoYesSkipCommit":
            choice = "skip";
            break;
          case "autoNo":
            choice = "new";
            break;
        }
      } else {
        choice = await selectPrompt({
          title: `Repository ${options.githubUsername}/${options.projectName} already exists and you own it. What would you like to do?`,
          content:
            "Note: A commit will be created and pushed only if you have uncommitted changes.",
          options: [
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
          ],
          defaultValue: "commit",
        });
      }

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
          options.memory,
          newName,
          options.githubUsername,
          effectiveDir,
          options.isDev,
          options.cwd,
          options.shouldMaskSecretInput,
          options.config,
        );
      }

      if (choice === "commit" || choice === "skip") {
        relinka(
          "info",
          `Using existing repo: ${options.githubUsername}/${options.projectName}`,
        );

        if (choice === "commit") {
          // Create Octokit instance with GitHub token
          if (!options.memory.githubKey) {
            throw new Error("GitHub token not found");
          }

          // Add and commit all files in the working directory
          const git = simpleGit({ baseDir: effectiveDir });
          await git.add(".");
          await git.commit(`Update by ${cliName}`);

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
      options.memory,
      options.projectName,
      options.githubUsername,
      effectiveDir,
      options.isDev,
      options.cwd,
      options.shouldMaskSecretInput,
      options.config,
    );
  } catch (error) {
    if (error instanceof Error && error.message.includes("already exists")) {
      relinka(
        "error",
        `Repository '${options.projectName}' already exists on GitHub`,
      );
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
 * Pushes local commits to the remote
 */
export async function pushGitCommits(options: GitOptions): Promise<boolean> {
  const effectiveDir = getEffectiveDir(options);

  try {
    if (
      !(await isDirHasGit(
        options.cwd,
        options.isDev,
        options.projectName,
        options.projectPath,
      ))
    ) {
      relinka("error", "Not a git repository. Please initialize git first.");
      return false;
    }

    const git = simpleGit({ baseDir: effectiveDir });

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
