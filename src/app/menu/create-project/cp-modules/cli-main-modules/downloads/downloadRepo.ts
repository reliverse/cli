import { selectPrompt } from "@reliverse/prompts";
import { relinka } from "@reliverse/relinka";
import fs from "fs-extra";
import { installDependencies } from "nypm";
import path, { dirname } from "pathe";
import { simpleGit } from "simple-git";

import { cacheDirectory } from "~/utils/cacheHelpers.js";
import { relide } from "~/utils/debugHelpers.js";

/**
 * Defines the options for downloading a project from a remote repository.
 */
export type DownloadRepoOptions = {
  /**
   * The repository to download, such as "owner/repo" (github:owner/repo), "owner/repo#ref" (github:owner/repo#ref), or "github:owner/repo/subdir".
   */
  repoURL: string;

  /**
   * The name of the new local project directory.
   */
  projectName: string;

  /**
   * Indicates if this operation is running in a development environment (used to place project in a 'tests-runtime' folder).
   */
  isDev: boolean;

  /**
   * The current working directory where the new project folder will be created.
   */
  cwd: string;

  /**
   * Optional authentication token (e.g., GitHub personal access token) if the repository is private.
   */
  auth?: string;

  /**
   * If true, automatically installs dependencies (via `nypm`) after downloading.
   */
  install?: boolean;

  /**
   * Specifies which Git hosting service to use. Supported values are "github", "gitlab", "bitbucket", and "sourcehut".
   */
  provider?: "github" | "gitlab" | "bitbucket" | "sourcehut";

  /**
   * If set, only extracts a specified subdirectory from the downloaded repository.
   */
  subdirectory?: string;

  /**
   * If true, forces the download to proceed even if the target directory is not empty.
   */
  force?: boolean;

  /**
   * If true, removes any existing contents in the target directory before downloading.
   */
  forceClean?: boolean;

  /**
   * If true, runs in offline mode (fails if the repo is not already cached locally).
   */
  offline?: boolean;

  /**
   * If true, tries to use a cached copy of the repo when available, falling back to a live download only if needed.
   */
  preferOffline?: boolean;
};

/**
 * Minimal structure containing repository metadata needed for download operations.
 */
type RepoInfo = {
  name: string;
  version: string;
  gitUrl?: string;
  subdir?: string | undefined;
  defaultDir?: string;
  headers?: Record<string, string>;
};

/**
 * Represents the result of a successful download operation, including the source URL and the local directory path.
 */
export type DownloadResult = {
  source: string;
  dir: string;
};

type GitProvider = "github" | "gitlab" | "bitbucket" | "sourcehut";

/* -----------------------------------------------------------------------
 *  Helper methods for URL parsing, caching, and Git operations
 * ----------------------------------------------------------------------- */

/**
 * Reads a Git repository string and extracts the provider (optional), repository path, reference/branch, and subdirectory.
 *
 * Supports formats:
 *   - "owner/repo"
 *   - "owner/repo#ref"
 *   - "provider:owner/repo"
 *   - "provider:owner/repo#ref"
 *   - Any of above with optional "/subdir" at end
 *   - Full URLs (e.g., "https://github.com/owner/repo")
 */
function parseGitURI(input: string) {
  // Normalize input: trim whitespace and remove protocol/domain if present
  const normalizedInput = input
    .trim()
    .replace(
      /^https?:\/\/(www\.)?(github|gitlab|bitbucket|sourcehut)\.com\//,
      "",
    )
    .replace(/^(github|gitlab|bitbucket|sourcehut)\.com\//, "")
    .replace(/^https?:\/\/git\.sr\.ht\/~/, "") // Special case for sourcehut
    .replace(/^git\.sr\.ht\/~/, ""); // Special case for sourcehut without protocol

  const pattern =
    /^(?:(?<provider>[^:]+):)?(?<repo>[^#]+)(?<refPart>#[^/]+)?(?<subdir>\/.*)?$/;
  const match = pattern.exec(normalizedInput);

  if (!match?.groups) {
    return {
      provider: undefined,
      repo: normalizedInput,
      ref: "main",
      subdir: "",
    };
  }

  const { provider, repo, refPart, subdir } = match.groups;
  return {
    provider: provider?.trim(),
    repo: repo?.trim() ?? normalizedInput,
    ref: refPart ? refPart.slice(1).trim() : "main",
    subdir: subdir?.trim() ?? "",
  };
}

/**
 * Creates a URL to download the repository and prepares any necessary HTTP headers.
 */
function computeRepoInfo(
  input: string,
  defaultProvider: GitProvider,
  auth?: string,
  subdirectory?: string,
): RepoInfo {
  const { provider: parsedProvider, repo, ref, subdir } = parseGitURI(input);
  const actualProvider = (parsedProvider ?? defaultProvider) as GitProvider;

  const name = repo.replace("/", "-");
  const headers: Record<string, string> = {};

  if (auth) {
    headers["Authorization"] = `Bearer ${auth}`;
  }

  return {
    name,
    version: ref,
    subdir: subdirectory ?? subdir?.replace(/^\/+/, ""), // Use provided subdirectory or from URI
    defaultDir: name,
    headers,
    gitUrl: getRepoUrl(repo, actualProvider),
  };
}

/**
 * Gets the repository URL based on the provider.
 */
function getRepoUrl(repo: string, provider: GitProvider): string {
  switch (provider) {
    case "gitlab":
      return `https://gitlab.com/${repo}.git`;
    case "bitbucket":
      return `https://bitbucket.org/${repo}.git`;
    case "sourcehut":
      return `https://git.sr.ht/~${repo}`;
    default:
      return `https://github.com/${repo}.git`;
  }
}

/**
 * Checks if a repository has changed by comparing remote and local refs.
 */
async function hasRepoChanged(
  git: ReturnType<typeof simpleGit>,
  repoPath: string,
  ref: string,
): Promise<boolean> {
  try {
    if (!(await fs.pathExists(path.join(repoPath, ".git")))) {
      return true;
    }
    await git.cwd(repoPath);
    const localRef = await git.revparse([ref]);
    const remoteRef = await git.revparse([`origin/${ref}`]);
    return localRef !== remoteRef;
  } catch {
    return true; // If any error occurs, assume the repo has changed
  }
}

/**
 * Clones or updates a repository in the cache directory.
 */
async function cloneOrUpdateCache(
  repoUrl: string,
  cachePath: string,
  ref: string,
  offline: boolean,
  preferOffline: boolean,
  auth?: string,
) {
  const git = simpleGit();
  const gitDirExists = await fs.pathExists(path.join(cachePath, ".git"));
  const cacheExists = await fs.pathExists(cachePath);

  // Handle offline mode
  if (offline && !gitDirExists) {
    throw new Error("Offline mode: no cached repository available.");
  }

  // If preferOffline and valid cache exists, use it without checking for updates
  if (preferOffline && gitDirExists) {
    relide("Using preferOffline. Found existing cache => skipping network.");
    return;
  }

  // If cache exists but is not a valid git repo, remove it
  if (cacheExists && !gitDirExists) {
    await fs.remove(cachePath);
  }

  if (gitDirExists) {
    // Check if repo has changed
    const changed = await hasRepoChanged(git, cachePath, ref);
    if (!changed) {
      relide("Repository unchanged => using cached version");
      return;
    }
    // Update existing repository
    await git.cwd(cachePath);
    await git.fetch(["origin", ref]);
    await git.checkout(ref);
    await git.pull();
  } else {
    // Ensure parent directory exists
    await fs.ensureDir(path.dirname(cachePath));

    // Clone new repository
    const cloneOptions: any = {
      "--branch": ref,
      "--depth": 1,
    };

    if (auth) {
      const authUrl = new URL(repoUrl);
      authUrl.username = "oauth2";
      authUrl.password = auth;
      await git.clone(authUrl.toString(), cachePath, cloneOptions);
    } else {
      await git.clone(repoUrl, cachePath, cloneOptions);
    }
  }
}

/**
 * Downloads a repository using git clone and optionally installs dependencies.
 * Supports caching, offline mode, and subdirectory extraction.
 *
 * @param options - An object of type DownloadRepoOptions specifying all download requirements.
 * @returns A promise that resolves to a DownloadResult containing the source and local directory path.
 */
export async function downloadRepo({
  repoURL,
  projectName,
  isDev,
  cwd,
  auth,
  install = false,
  provider = "github",
  subdirectory,
  force = false,
  forceClean = false,
  offline = false,
  preferOffline = false,
}: DownloadRepoOptions): Promise<DownloadResult> {
  relinka("info", `Downloading repo ${repoURL}...`);

  try {
    // 1) Decide where to create the project
    const projectPath = isDev
      ? path.join(cwd, "tests-runtime", projectName)
      : path.join(cwd, projectName);

    relinka("info-verbose", `Preparing to place repo in: ${projectPath}`);

    // 2) Handle existing directory
    if (forceClean) {
      await fs.remove(projectPath);
    } else if (!force && (await fs.pathExists(projectPath))) {
      const files = await fs.readdir(projectPath);
      const hasOnlyReliverseConfig =
        files.length === 1 && files[0] === ".reliverse";

      if (files.length > 0 && !hasOnlyReliverseConfig) {
        throw new Error(
          `Target directory ${projectPath} is not empty and contains files other than .reliverse`,
        );
      }
    }

    await fs.ensureDir(projectPath);

    // 3) Handle .reliverse file
    const parentDir = dirname(projectPath);
    const tempReliverseConfigPath = path.join(parentDir, ".reliverse");
    const hasReliverseConfig = await fs.pathExists(
      path.join(projectPath, ".reliverse"),
    );

    if (hasReliverseConfig) {
      if (await fs.pathExists(tempReliverseConfigPath)) {
        const choice = await selectPrompt({
          title:
            ".reliverse already exists in parent directory. What would you like to do?",
          options: [
            { value: "delete", label: "Delete existing file" },
            { value: "backup", label: "Create backup" },
          ],
        });

        if (choice === "delete") {
          await fs.remove(tempReliverseConfigPath);
        } else {
          let backupPath = path.join(parentDir, ".reliverse.bak");
          let iteration = 1;
          while (await fs.pathExists(backupPath)) {
            backupPath = path.join(parentDir, `.reliverse_${iteration}.bak`);
            iteration++;
          }
          await fs.move(tempReliverseConfigPath, backupPath);
        }
      }

      await fs.move(
        path.join(projectPath, ".reliverse"),
        tempReliverseConfigPath,
      );
      await fs.remove(projectPath);
      await fs.ensureDir(projectPath);
    }

    // 4) Parse repository info and prepare URLs
    const { provider: parsedProvider, repo, ref } = parseGitURI(repoURL);
    const gitProvider = (parsedProvider ?? provider) as GitProvider;
    const cloneUrl = getRepoUrl(repo, gitProvider);

    // 5) Compute repo info for caching and subdirectory handling
    const repoInfo = computeRepoInfo(repoURL, gitProvider, auth, subdirectory);

    // 6) Set up caching
    const cachePath = path.join(
      cacheDirectory(),
      gitProvider,
      repoInfo.name,
      repoInfo.version,
    );

    // 7) Clone or update the cache
    await cloneOrUpdateCache(
      cloneUrl,
      cachePath,
      ref,
      offline,
      preferOffline,
      auth,
    );

    // 8) Copy from cache to target
    relinka("info-verbose", `Copying files to: ${projectPath}`);
    if (repoInfo.subdir) {
      const sourcePath = path.join(cachePath, repoInfo.subdir);
      if (await fs.pathExists(sourcePath)) {
        await fs.copy(sourcePath, projectPath);
      } else {
        throw new Error(
          `Subdirectory ${repoInfo.subdir} not found in repository ${repoURL}`,
        );
      }
    } else {
      await fs.copy(cachePath, projectPath, {
        filter: (src) => !src.includes(".git"),
      });
    }

    // 9) Restore .reliverse if we moved it
    if (hasReliverseConfig) {
      await fs.move(
        tempReliverseConfigPath,
        path.join(projectPath, ".reliverse"),
        { overwrite: true },
      );
    }

    // 10) Install dependencies if requested
    if (install) {
      relinka("info", "Installing dependencies...");
      await installDependencies({
        cwd: projectPath,
        silent: false,
      });
    }

    relinka("success-verbose", "Repository downloaded successfully!");
    return {
      source: repoURL,
      dir: projectPath,
    };
  } catch (error) {
    relinka("error", "Failed to download repository...");
    if (error instanceof Error) {
      throw new Error(`Failed to download ${repoURL}: ${error.message}`, {
        cause: error,
      });
    }
    throw error;
  }
}
