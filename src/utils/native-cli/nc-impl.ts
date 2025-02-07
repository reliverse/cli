import { relinka } from "@reliverse/prompts";
import fs from "fs-extra";
import { globby } from "globby";
import { installDependencies } from "nypm";
import { ofetch } from "ofetch";
import pLimit from "p-limit";
import { dirname, join } from "pathe";
import semver from "semver";
import { fileURLToPath } from "url";

// ────────────────────────────────────────────────
// Configuration & Constants
// ────────────────────────────────────────────────

const verbose = false;
const BASE_URL = "https://jsr.io";

/** Emulate __dirname in ESM. */
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// ────────────────────────────────────────────────
// Type Definitions
// ────────────────────────────────────────────────

/** Package-level metadata structure returned by JSR. */
type PackageMeta = {
  scope: string;
  name: string;
  versions: Record<string, { yanked?: boolean }>;
};

/** Version-level metadata structure returned by JSR. */
type VersionMeta = {
  manifest: Record<
    string,
    {
      size: number;
      checksum: string;
    }
  >;
  moduleGraph1?: Record<string, unknown>;
  exports?: Record<string, string>;
};

// ────────────────────────────────────────────────
// HTTP & JSON Helpers
// ────────────────────────────────────────────────

/**
 * Fetches JSON from the provided URL using ofetch.
 */
async function fetchJson<T>(url: string): Promise<T> {
  try {
    return await ofetch<T>(url, {
      headers: { Accept: "application/json" },
    });
  } catch (error) {
    throw new Error(`Failed to fetch JSON from "${url}" (error: ${error})`);
  }
}

// ────────────────────────────────────────────────
// JSR API Helpers
// ────────────────────────────────────────────────

/**
 * Fetches the package metadata (meta.json) for @scope/packageName from JSR.
 */
async function getPackageMeta(
  scope: string,
  packageName: string,
): Promise<PackageMeta> {
  const url = `${BASE_URL}/@${scope}/${packageName}/meta.json`;
  return fetchJson<PackageMeta>(url);
}

/**
 * Picks a suitable version from the PackageMeta.
 * If userVersion is provided, verifies that it exists and is not yanked.
 * Otherwise, returns the highest semver-valid, non‑yanked version.
 */
function pickVersionFromMeta(meta: PackageMeta, userVersion?: string): string {
  if (userVersion) {
    const info = meta.versions[userVersion];
    if (!info) {
      throw new Error(
        `Version "${userVersion}" not found in package metadata.`,
      );
    }
    if (info.yanked) {
      throw new Error(
        `Version "${userVersion}" is yanked and cannot be downloaded.`,
      );
    }
    return userVersion;
  }

  // Filter valid non-yanked versions with valid semver
  const versions = Object.keys(meta.versions).filter((v) => {
    const versionInfo = meta.versions[v];
    return versionInfo && !versionInfo.yanked && semver.valid(v);
  });

  if (versions.length === 0) {
    throw new Error(
      "No valid (non-yanked, semver) versions found for this package.",
    );
  }

  // Pick the highest version (using semver sort)
  versions.sort((a, b) => semver.rcompare(a, b));
  return versions[0]!;
}

/**
 * Fetches version-specific metadata (_meta.json) for a given scope/packageName/version.
 */
async function getVersionMeta(
  scope: string,
  packageName: string,
  version: string,
): Promise<VersionMeta> {
  const url = `${BASE_URL}/@${scope}/${packageName}/${version}_meta.json`;
  return fetchJson<VersionMeta>(url);
}

/**
 * Downloads a single file from the JSR registry and writes it to disk.
 * The target path structure depends on the value of useSinglePath.
 */
async function downloadFile(
  scope: string,
  packageName: string,
  version: string,
  filePath: string,
  outputDir: string,
  useSinglePath: boolean,
): Promise<void> {
  const trimmedFilePath = filePath.replace(/^\//, "");
  const url = `${BASE_URL}/@${scope}/${packageName}/${version}/${trimmedFilePath}`;

  const buffer = Buffer.from(
    await ofetch(url, {
      headers: { Accept: "*/*" },
      responseType: "arrayBuffer",
    }),
  );

  const targetFilePath = useSinglePath
    ? join(outputDir, trimmedFilePath)
    : join(outputDir, scope, packageName, version, trimmedFilePath);

  await fs.ensureDir(dirname(targetFilePath));
  await fs.writeFile(targetFilePath, buffer);

  relinka("success-verbose", `Downloaded: ${url} -> ${targetFilePath}`);
}

/**
 * Checks if the package is already downloaded in the target directory.
 */
async function isPackageDownloaded(
  filePaths: string[],
  outputDir: string,
  useSinglePath: boolean,
  scope: string,
  packageName: string,
  version: string,
): Promise<boolean> {
  try {
    for (const filePath of filePaths) {
      const trimmedFilePath = filePath.replace(/^\//, "");
      const targetFilePath = useSinglePath
        ? join(outputDir, trimmedFilePath)
        : join(outputDir, scope, packageName, version, trimmedFilePath);

      if (!(await fs.pathExists(targetFilePath))) {
        return false;
      }
    }
    return true;
  } catch {
    return false;
  }
}

/**
 * Renames all -tsx.txt files back to .tsx in the specified directory.
 */
async function renameTxtToTsx(dir: string): Promise<void> {
  try {
    const files = await globby("**/*-tsx.txt", {
      cwd: dir,
      absolute: true,
    });
    for (const filePath of files) {
      const newPath = filePath.replace(/-tsx\.txt$/, ".tsx");
      await fs.rename(filePath, newPath);
      if (verbose) {
        relinka("success-verbose", `Renamed: ${filePath} -> ${newPath}`);
      }
    }
  } catch (error) {
    relinka(
      "error",
      "Error renaming -tsx.txt files:",
      error instanceof Error ? error.message : String(error),
    );
  }
}

// ────────────────────────────────────────────────
// Main Download Function
// ────────────────────────────────────────────────

/**
 * Downloads all files for a given JSR package concurrently.
 *
 * @param scope - e.g. "luca"
 * @param packageName - e.g. "flag"
 * @param version - Specific version; if omitted, the highest valid version is chosen.
 * @param outputDir - Where to save files. (Defaults to "<__dirname>/output")
 * @param useSinglePath - If true, writes all files directly into outputDir; otherwise uses a nested structure.
 * @param concurrency - Maximum number of parallel downloads (default: 5)
 * @param pkgIsCLI - Whether the package is a CLI tool.
 * @param msgDownloadStarted - Optional custom message when download starts.
 * @param revertTsxFiles - If true (and pkgIsCLI), renames -tsx.txt files back to .tsx after download.
 * @param cliInstallDeps - If true (and pkgIsCLI), installs dependencies after download.
 */
export async function downloadJsrDist(
  scope: string,
  packageName: string,
  version?: string,
  outputDir: string = join(__dirname, "output"),
  useSinglePath = true,
  concurrency = 5,
  pkgIsCLI = true,
  msgDownloadStarted?: string,
  revertTsxFiles = false,
  cliInstallDeps = true,
): Promise<void> {
  try {
    // 1) Fetch package metadata and determine version
    const meta = await getPackageMeta(scope, packageName);
    const resolvedVersion = version || pickVersionFromMeta(meta);

    // 2) Get version metadata, including manifest of files to download
    const versionMeta = await getVersionMeta(
      scope,
      packageName,
      resolvedVersion,
    );
    const filePaths = Object.keys(versionMeta.manifest);

    // 3) If package already exists locally, notify and exit
    const isDownloaded = await isPackageDownloaded(
      filePaths,
      outputDir,
      useSinglePath,
      scope,
      packageName,
      resolvedVersion,
    );
    if (isDownloaded) {
      relinka(
        "success",
        `@${scope}/${packageName}@${resolvedVersion} is already downloaded.`,
        pkgIsCLI
          ? `Use "bun ${outputDir}/bin/main.ts" to run it (short command coming soon).`
          : undefined,
      );
      return;
    }

    // 4) Notify the user that the download is starting
    relinka(
      "info",
      msgDownloadStarted ??
        `Downloading ${scope}/${packageName}@${resolvedVersion} from JSR...`,
    );

    // 5) Download files concurrently using p-limit
    const limit = pLimit(concurrency);
    const tasks = filePaths.map((filePath) =>
      limit(() =>
        downloadFile(
          scope,
          packageName,
          resolvedVersion,
          filePath,
          outputDir,
          useSinglePath,
        ),
      ),
    );
    await Promise.all(tasks);

    // 6) Optionally rename -tsx.txt files back to .tsx (for CLI packages)
    if (pkgIsCLI && revertTsxFiles) {
      relinka("info-verbose", "Reverting .tsx files...");
      await renameTxtToTsx(outputDir);
    }

    // 7) Optionally install dependencies (for CLI packages)
    if (pkgIsCLI && cliInstallDeps) {
      relinka("info", "Installing dependencies...");
      await installDependencies({
        cwd: outputDir,
        silent: false,
      });
    }

    // 8) Notify the user of successful download
    relinka(
      "success",
      `All files for @${scope}/${packageName} downloaded successfully.`,
      pkgIsCLI
        ? `Use "bun ${outputDir}/bin/main.ts" to run it (short command coming soon).`
        : undefined,
    );
  } catch (error) {
    relinka(
      "error",
      `Something went wrong while downloading ${scope}/${packageName}:`,
      `${error}`,
    );
    throw error;
  }
}
