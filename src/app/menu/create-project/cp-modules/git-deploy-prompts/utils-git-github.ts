import fs from "fs-extra";
import { homedir } from "os";
import path from "pathe";
import { simpleGit } from "simple-git";

import { relinka } from "~/app/menu/create-project/cp-modules/cli-main-modules/handlers/logger.js";

/**
 * Checks if the given directory is a git repository
 * @param dir - Directory to check
 * @param isDev - Whether we are in development mode
 * @param projectName - Name of the project (used if isDev = true)
 * @returns Promise<boolean> - Whether the directory is a git repository
 */
export async function isGitRepo(
  cwd: string,
  isDev: boolean,
  projectName: string,
  projectPath: string,
): Promise<boolean> {
  const finalDir = isDev
    ? path.join(cwd, "tests-runtime", projectName)
    : projectPath;

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
 * Clones a repository to a temporary directory and copies specified files
 * @param repoUrl - URL of the repository to clone
 * @param projectPath - Directory to copy files to
 * @returns Promise<boolean> - Whether the operation was successful
 */
export async function cloneAndCopyFiles(
  repoUrl: string,
  projectPath: string,
): Promise<boolean> {
  const tempDir = path.join(
    homedir(),
    ".reliverse",
    "temp",
    Date.now().toString(),
  );
  try {
    // Create temp directory
    await fs.ensureDir(tempDir);

    // Clone repository to temp directory
    const git = simpleGit();
    await git.clone(repoUrl, tempDir);

    // Copy .git directory
    const gitDir = path.join(tempDir, ".git");
    if (await fs.pathExists(gitDir)) {
      // Remove existing .git directory if it exists
      const targetGitDir = path.join(projectPath, ".git");
      if (await fs.pathExists(targetGitDir)) {
        await fs.remove(targetGitDir);
        relinka("info", "Removed existing .git directory");
      }
      await fs.copy(gitDir, path.join(projectPath, ".git"), {
        preserveTimestamps: true,
        dereference: false,
        errorOnExist: false,
      });
      // Set hidden attribute on Windows
      if (process.platform === "win32") {
        const { exec } = await import("child_process");
        exec(`attrib +h "${path.join(projectPath, ".git")}"`, (error) => {
          if (error) {
            relinka("warn", "Could not set hidden attribute on .git folder");
          }
        });
      }
      relinka("info", "Copied .git folder from existing repository");
    } else {
      throw new Error("Required .git folder not found");
    }

    // Copy specific files
    const filesToCopy = [
      { name: "README.md", required: false },
      { alternatives: ["LICENSE", "LICENSE.md"], required: false },
    ];

    for (const file of filesToCopy) {
      if (file.name) {
        const sourcePath = path.join(tempDir, file.name);
        if (await fs.pathExists(sourcePath)) {
          await fs.copy(sourcePath, path.join(projectPath, file.name));
          relinka("info", `Copied ${file.name} from existing repository`);
        }
      } else if (file.alternatives) {
        for (const name of file.alternatives) {
          const filePath = path.join(tempDir, name);
          if (await fs.pathExists(filePath)) {
            await fs.copy(filePath, path.join(projectPath, name));
            relinka("info", `Copied ${name} from existing repository`);
            break;
          }
        }
      }
    }

    return true;
  } catch (error) {
    relinka(
      "error",
      "Failed to clone repository:",
      error instanceof Error ? error.message : String(error),
    );
    return false;
  } finally {
    // Cleanup temp directory
    try {
      await fs.remove(tempDir);
    } catch (error) {
      relinka("warn", "Failed to cleanup temporary directory:", String(error));
    }
  }
}

export async function cloneToTempAndCopyFiles(
  repoUrl: string,
  projectPath: string,
): Promise<boolean> {
  return await cloneAndCopyFiles(repoUrl, projectPath);
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
  cwd: string,
  isDev: boolean,
  projectName: string,
  projectPath: string,
  remoteUrl: string,
  remoteName = "origin",
): Promise<boolean> {
  const finalDir = isDev
    ? path.join(cwd, "tests-runtime", projectName)
    : projectPath;

  try {
    // Validate directory and git repo
    if (!(await fs.pathExists(finalDir))) {
      relinka("error", `Directory does not exist: ${finalDir}`);
      return false;
    }

    if (!(await isGitRepo(cwd, isDev, projectName, projectPath))) {
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
