import { confirmPrompt, relinka } from "@reliverse/prompts";
import fs from "fs-extra";
import path from "pathe";

import { homeDir } from "~/app/constants.js";
import { getUsernameFrontend } from "~/utils/getUsernameFrontend.js";
import { initGithubSDK } from "~/utils/instanceGithub.js";
import { getReliverseMemory } from "~/utils/reliverseMemory.js";

/**
 * Determines if we log additional debug info.
 * Set to `true` for verbose output.
 */
export const multireliVerbose = false;

/**
 * Helper to conditionally log verbose messages based on `multireliVerbose`.
 * @param msg - The message to log.
 * @param data - Optional additional data to log.
 */
export function logVerbose(msg: string, data?: unknown): void {
  if (multireliVerbose) {
    console.log(`Debug - ${msg}`, data ?? "");
  }
}

/**
 * Configuration data for a single project.
 */
export type GenCfg = {
  projectName: string;
  projectTemplate: string;
  getEnvExample: boolean;
  projectPath?: string;
};

/**
 * Shape of the JSONC config file (wrapper around GenCfg[]).
 */
export type GenCfgJsonc = {
  genCfg: GenCfg[];
};

/**
 * Gets the path to the env cache directory (used for storing .env.example files).
 * @returns Absolute path to the `.reliverse/envs` directory.
 */
export function getEnvCacheDir(): string {
  return path.join(homeDir, ".reliverse", "envs");
}

/**
 * Ensures the env cache directory exists (creates if necessary).
 * @returns The cache directory path.
 */
export async function ensureEnvCacheDir(): Promise<string> {
  const cacheDir = getEnvCacheDir();
  await fs.ensureDir(cacheDir);
  return cacheDir;
}

/**
 * Builds the full cache file path for a repository's `.env.example` file.
 * @param repo - Owner/repo string.
 * @param branch - The git branch (defaults to "main").
 * @returns The absolute path to the cached `.env.example` file.
 */
export function getEnvCachePath(repo: string, branch = "main"): string {
  const cacheDir = getEnvCacheDir();
  // Create a safe filename by replacing slashes and other problematic characters
  const safeRepoName = repo.replace(/[/\\:]/g, "_");
  return path.join(cacheDir, `${safeRepoName}_${branch}.env.example`);
}

/**
 * Downloads a `.env.example` file from a GitHub repository with optional caching.
 * @param repo - The owner/repo string (e.g., "username/repo").
 * @param filePath - The file path within the repo (usually ".env.example").
 * @param branch - The git branch to use. Defaults to "main".
 * @param useCache - Whether to use local caching. Defaults to true.
 * @param useFresh - If true, bypasses existing cache. Defaults to false.
 * @returns The file content as a string, or null if download fails.
 */
export async function downloadFileFromGitHub(
  repo: string,
  filePath: string,
  branch = "main",
  useCache = true,
  useFresh = false,
): Promise<string | null> {
  // -----------------------------------------------------------------
  // STEP 1: Attempt to read from cache if enabled and not in fresh mode
  // -----------------------------------------------------------------
  if (useCache && !useFresh) {
    const cachePath = getEnvCachePath(repo, branch);
    const cacheExists = await fs.pathExists(cachePath);

    if (cacheExists) {
      const stats = await fs.stat(cachePath);
      const fileAge = Date.now() - stats.mtimeMs;
      // Cache is considered valid for 24 hours (86400000 ms)
      const oneDayMs = 24 * 60 * 60 * 1000;
      if (fileAge < oneDayMs) {
        logVerbose(`Using cached .env.example for ${repo} (${branch}).`);
        return fs.readFile(cachePath, "utf-8");
      }
    }
  }

  // -----------------------------------------------------------------
  // STEP 2: Initialize GitHub SDK & gather credentials
  // -----------------------------------------------------------------
  let repoOwner = "";
  let repoName = "";
  try {
    if (repo.includes("/")) {
      const repoParts = repo.split("/");
      if (repoParts.length !== 2) {
        throw new Error(
          `Invalid repository format: "${repo}". Expected format: "owner/repo".`,
        );
      }
      repoOwner = repoParts[0]!;
      repoName = repoParts[1]!;
    }

    // Prompt user about secret masking
    const maskInput = await confirmPrompt({
      title:
        "Do you want to mask secret inputs (e.g., GitHub token) in the next steps?",
      content:
        "Regardless of your choice, your data will be securely stored on your device.",
    });

    // Memory used for storing credentials
    const memory = await getReliverseMemory();

    // Determine the user's local GitHub username or prompt them
    const frontendUsername = await getUsernameFrontend(memory, false);
    if (!frontendUsername) {
      throw new Error(
        "Failed to determine your frontend username. Please try again or notify the CLI developers.",
      );
    }

    // Initialize Octokit
    const githubResult = await initGithubSDK(
      memory,
      frontendUsername,
      maskInput,
    );
    if (!githubResult) {
      throw new Error(
        "Failed to initialize Octokit SDK. Please notify CLI developers if the problem persists.",
      );
    }

    const [githubToken, githubInstance, githubUsername] = githubResult;

    // If repo is private and owned by someone else, we can't download it
    if (repoOwner !== githubUsername && repoOwner !== "") {
      throw new Error(
        `Private repository ${repo} owned by a different user (${repoOwner}) cannot be accessed. 
Please use a repository you own or a public repository.`,
      );
    }

    // -----------------------------------------------------------------
    // STEP 3: Download file from GitHub
    // ----------------------------------------------------------------
    if (!repoOwner || !repoName) {
      throw new Error(
        `Invalid repository format: "${repo}". Expected format: "owner/repo".`,
      );
    }

    logVerbose(
      `${useFresh ? "Fresh mode - d" : "D"}ownloading file from GitHub: ${repoOwner}/${repoName}/${filePath} (branch: ${branch}).`,
    );

    // Use Octokit to get file content
    const response = await githubInstance.rest.repos.getContent({
      owner: repoOwner,
      repo: repoName,
      path: filePath,
      ref: `refs/heads/${branch}`,
      headers: {
        authorization: `Bearer ${githubToken}`,
      },
    });

    if (response.status !== 200) {
      relinka(
        "warn",
        `Failed to download ${filePath} from ${repo} (${branch}): ${response.status}`,
      );
      return null;
    }

    // Ensure we're dealing with a single file (not a directory)
    const data = response.data;
    if (
      Array.isArray(data) ||
      data.type !== "file" ||
      !data.content ||
      !data.encoding
    ) {
      relinka(
        "warn",
        `Unexpected response format for ${filePath} from ${repo} (${branch}).`,
      );
      return null;
    }

    // Must be base64-encoded
    if (data.encoding !== "base64") {
      relinka(
        "warn",
        `Unexpected encoding for ${filePath} from ${repo} (${branch}): ${data.encoding}.`,
      );
      return null;
    }

    // Decode file content
    const decodedContent = Buffer.from(data.content, "base64").toString(
      "utf-8",
    );

    // -----------------------------------------------------------------
    // STEP 4: Cache the file if caching is enabled
    // -----------------------------------------------------------------
    if (useCache) {
      const cachePath = getEnvCachePath(repo, branch);
      await ensureEnvCacheDir();
      await fs.writeFile(cachePath, decodedContent);
      logVerbose(
        `Cached .env.example for ${repo} (${branch}) at ${cachePath}.`,
      );
    }

    return decodedContent;
  } catch (error) {
    relinka(
      "warn",
      `Failed to download ${filePath} from ${repo} (${branch}): ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
    return null;
  }
}
