import { selectPrompt } from "@reliverse/prompts";
import { relinka } from "@reliverse/relinka";
import fs from "fs-extra";
import { installDependencies } from "nypm";
import path, { dirname } from "pathe";
import { simpleGit } from "simple-git";

import type { ReliverseConfig } from "~/utils/schemaConfig.js";

import { initGitDir } from "~/app/menu/create-project/cp-modules/git-deploy-prompts/git.js";
import { setHiddenAttributeOnWindows } from "~/utils/filesysHelpers.js";

/**
 * Defines the options for downloading a project from a remote repository.
 */
type DownloadRepoOptions = {
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
   * If true, preserves the .git directory when cloning, maintaining Git history.
   * @default true
   */
  preserveGit?: boolean;

  /**
   * Configuration for the project when initializing a fresh Git repository.
   * Only used when preserveGit is false.
   */
  config?: ReliverseConfig | undefined;
};

/**
 * Minimal structure containing repository metadata needed for download operations.
 */
type RepoInfo = {
  name: string;
  version: string;
  gitUrl?: string;
  subdir?: string;
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
 *  Helper methods for URL parsing (restored) and building final RepoInfo
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
 * Creates a final RepoInfo object (including `gitUrl` and optional `headers`)
 * from the raw repo string and user options (e.g., `auth`, `subdirectory`).
 */
function computeRepoInfo(
  input: string,
  defaultProvider: GitProvider,
  auth?: string,
  subdirectory?: string,
): RepoInfo {
  const { provider: parsedProvider, repo, ref, subdir } = parseGitURI(input);
  const actualProvider = (parsedProvider ?? defaultProvider) as GitProvider;

  // Generate a name from the repo segment (owner/repo => owner-repo)
  const name = repo.replace("/", "-");

  // Build any HTTP headers needed (e.g., Authorization)
  const headers: Record<string, string> = {};
  if (auth) {
    headers["Authorization"] = `Bearer ${auth}`;
  }

  // Build the final repository URL
  const gitUrl = getRepoUrl(repo, actualProvider);

  return {
    name,
    version: ref,
    // Use the subdir from parseGitURI if no explicit subdirectory is given
    subdir: subdirectory ?? subdir.replace(/^\/+/, ""),
    defaultDir: name,
    headers,
    gitUrl,
  };
}

/**
 * Generates a new project name with an iteration number if the directory already exists.
 * For example: "my-project" -> "my-project-1" -> "my-project-2"
 */
async function getUniqueProjectPath(
  basePath: string,
  projectName: string,
  isDev: boolean,
): Promise<string> {
  let iteration = 1;
  let currentPath = basePath;
  let currentName = projectName;

  while (await fs.pathExists(currentPath)) {
    currentName = `${projectName}-${iteration}`;
    currentPath = isDev
      ? path.join(dirname(basePath), "tests-runtime", currentName)
      : path.join(dirname(basePath), currentName);
    iteration++;
  }

  return currentPath;
}

/* -----------------------------------------------------------------------
 *  Main download function (no cache usage)
 * ----------------------------------------------------------------------- */

/**
 * Downloads a repository using git clone (shallow clone) and optionally installs dependencies.
 * If a subdirectory is requested, clones to a temporary location, then copies just that folder.
 * If `preserveGit` is false, removes the .git directory or filters it out.
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
  preserveGit = true,
  config,
}: DownloadRepoOptions): Promise<DownloadResult> {
  relinka("info-verbose", `Downloading repo ${repoURL}...`);

  try {
    // 1) Decide where to create the project
    let projectPath = isDev
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
        // Instead of throwing an error, get a new unique path
        projectPath = await getUniqueProjectPath(
          projectPath,
          projectName,
          isDev,
        );
        relinka(
          "info-verbose",
          `Directory already exists. Using new path: ${projectPath}`,
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
      // If there's already a .reliverse in the parent dir, ask the user how to proceed
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

      // Move the .reliverse out of the target folder so we can safely remove/copy
      await fs.move(
        path.join(projectPath, ".reliverse"),
        tempReliverseConfigPath,
      );
      await fs.remove(projectPath);
      await fs.ensureDir(projectPath);
    }

    // 4) Parse and compute final repo info
    const repoInfo = computeRepoInfo(repoURL, provider, auth, subdirectory);

    if (!repoInfo.gitUrl) {
      throw new Error(`Invalid repository URL or provider: ${repoURL}`);
    }

    // 5) Prepare final shallow clone options
    const git = simpleGit();
    // Only do a shallow clone if we're not preserving Git history
    const cloneOptions = ["--branch", repoInfo.version];
    if (!preserveGit) {
      cloneOptions.push("--depth", "1");
    }

    // If private repo with auth, embed token in the URL
    let finalUrl = repoInfo.gitUrl;
    if (auth) {
      const authUrl = new URL(repoInfo.gitUrl);
      // For GitHub (and other providers), set username='oauth2' and password=token
      authUrl.username = "oauth2";
      authUrl.password = auth;
      finalUrl = authUrl.toString();
    }

    // If a subdirectory was specified, we clone into a temporary directory first
    let cloneTarget = projectPath;
    if (repoInfo.subdir) {
      cloneTarget = await fs.mkdtemp(path.join(parentDir, "gitclone-"));
    }

    // Perform the clone
    await git.clone(finalUrl, cloneTarget, cloneOptions);

    // 6) If subdirectory was specified, copy just that folder to the final location
    if (repoInfo.subdir) {
      const srcSubdir = path.join(cloneTarget, repoInfo.subdir);
      if (!(await fs.pathExists(srcSubdir))) {
        throw new Error(
          `Subdirectory '${repoInfo.subdir}' not found in repository ${repoURL}`,
        );
      }

      if (preserveGit) {
        // Copy everything, including .git, from that subdir
        await fs.copy(srcSubdir, projectPath);
      } else {
        // Copy everything except .git
        await fs.copy(srcSubdir, projectPath, {
          filter: (src) => !src.includes(`${path.sep}.git`),
        });
      }

      // Clean up the temporary clone
      await fs.remove(cloneTarget);
    } else {
      // If preserveGit is false, remove the .git directory
      if (!preserveGit) {
        await fs.remove(path.join(projectPath, ".git"));

        // Optionally initialize a fresh Git repo
        if (config) {
          await initGitDir({
            cwd,
            isDev,
            projectName,
            projectPath,
            allowReInit: true,
            createCommit: true,
            config,
          });
        }
      } else {
        // If preserveGit is true, hide .git folder on Windows
        await setHiddenAttributeOnWindows(path.join(projectPath, ".git"));
      }
    }

    // 7) Restore .reliverse if it was moved
    if (hasReliverseConfig) {
      await fs.move(
        tempReliverseConfigPath,
        path.join(projectPath, ".reliverse"),
        { overwrite: true },
      );
    }

    // 8) Install dependencies if requested
    if (install) {
      relinka("info", "Installing dependencies...");
      await installDependencies({
        cwd: projectPath,
        silent: false,
      });
    }

    // 9) Done!
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
