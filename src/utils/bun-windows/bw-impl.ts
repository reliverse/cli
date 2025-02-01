import { relinka } from "@reliverse/prompts";
import fs from "fs-extra";
import { globby } from "globby";
import fetch from "node-fetch-native";
import { installDependencies } from "nypm";
import pLimit from "p-limit";
import { dirname, join } from "pathe";
import semver from "semver";
import { fileURLToPath } from "url";

/** Enable verbose logging for debugging. */
const verbose = false;

/** Emulate __dirname in ESM. */
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

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

/**
 * Fetches JSON from the provided URL, ensuring we don't include text/html in Accept.
 */
async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url, { headers: { Accept: "application/json" } });
  if (!res.ok) {
    throw new Error(
      `Failed to fetch JSON from "${url}" (status: ${res.status})`,
    );
  }
  return (await res.json()) as T;
}

/**
 * Fetches the package metadata (meta.json) for @scope/packageName from JSR.
 */
async function getPackageMeta(
  scope: string,
  packageName: string,
): Promise<PackageMeta> {
  const url = `https://jsr.io/@${scope}/${packageName}/meta.json`;
  return fetchJson<PackageMeta>(url);
}

/**
 * Picks a suitable version from the PackageMeta. If userVersion is provided,
 * verifies it is not yanked. Otherwise, picks the highest semver-valid, non-yanked version.
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

  const versions = Object.keys(meta.versions).filter(
    (v) => !meta.versions[v].yanked && semver.valid(v),
  );
  if (versions.length === 0) {
    throw new Error(
      "No valid (non-yanked, semver) versions found for this package.",
    );
  }

  versions.sort((a, b) => semver.rcompare(a, b));
  return versions[0]; // highest semver
}

/**
 * Fetches version-specific metadata (_meta.json) for a given scope/packageName/version.
 */
async function getVersionMeta(
  scope: string,
  packageName: string,
  version: string,
): Promise<VersionMeta> {
  const url = `https://jsr.io/@${scope}/${packageName}/${version}_meta.json`;
  return fetchJson<VersionMeta>(url);
}

/**
 * Downloads a single file from the JSR registry and writes it to:
 *   output/@scope/@packageName/@version/<filePath>
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
  const url = `https://jsr.io/@${scope}/${packageName}/${version}/${trimmedFilePath}`;
  const resp = await fetch(url, { headers: { Accept: "*/*" } });

  if (!resp.ok) {
    throw new Error(
      `Failed to download "${filePath}" (status: ${resp.status})`,
    );
  }
  const buffer = Buffer.from(await resp.arrayBuffer());

  // Determine the target path
  const targetFilePath = useSinglePath
    ? join(outputDir, trimmedFilePath)
    : join(outputDir, scope, packageName, version, trimmedFilePath);

  await fs.ensureDir(dirname(targetFilePath));
  await fs.writeFile(targetFilePath, buffer);

  relinka("success-verbose", `Downloaded: ${url} -> ${targetFilePath}`);
}

/**
 * Checks if the package is already downloaded in the target directory.
 * Returns true if all expected files exist, false otherwise.
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

/**
 * Downloads all files for a given JSR package in parallel (concurrent).
 * - scope: e.g. "luca"
 * - packageName: e.g. "flag"
 * - version: (Optional) specific version. Otherwise picks highest semver valid.
 * - outputDir: Where to save files. Defaults to "<__dirname>/output".
 * - useSinglePath: If true, writes all files directly into `outputDir`. Otherwise, uses nested structure.
 * - concurrency: Max number of parallel downloads (default: 5).
 * - pkgIsCLI: Whether the package is a CLI tool.
 * - msgDownloadStarted: Custom message to show when download starts.
 * - revertTsxFiles: If true and pkgIsCLI is true, renames -tsx.txt files back to .tsx after download.
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
  // cliUseExistentNodeModules = true,
): Promise<void> {
  try {
    // 1) Get package metadata
    const pkgMeta = await getPackageMeta(scope, packageName);

    // 2) Determine version to use
    const chosenVersion = pickVersionFromMeta(pkgMeta, version);

    // 3) Retrieve version metadata, including the file manifest
    const vMeta = await getVersionMeta(scope, packageName, chosenVersion);
    const filePaths = Object.keys(vMeta.manifest);

    // 4) Check if package is already downloaded
    const isDownloaded = await isPackageDownloaded(
      filePaths,
      outputDir,
      useSinglePath,
      scope,
      packageName,
      chosenVersion,
    );
    if (isDownloaded) {
      relinka(
        "success",
        `@${scope}/${packageName}@${chosenVersion} is already downloaded.`,
        pkgIsCLI
          ? `Use "bun ${outputDir}/bin/main.ts" to use it (short command is coming soon).`
          : undefined,
      );
      return;
    }

    // 5) Notify user that we're downloading the CLI
    relinka(
      "info",
      msgDownloadStarted ??
        `Downloading ${scope}/${packageName}@${chosenVersion} from JSR...`,
    );

    // 6) Use p-limit to control concurrency
    const limit = pLimit(concurrency);
    const tasks = filePaths.map((filePath) =>
      limit(() =>
        downloadFile(
          scope,
          packageName,
          chosenVersion,
          filePath,
          outputDir,
          useSinglePath,
        ),
      ),
    );

    // 7) Run all downloads in parallel, up to 'concurrency' at once
    await Promise.all(tasks);

    // 8) If pkgIsCLI and revertTsxFiles is true, rename -tsx.txt files back to .tsx
    if (pkgIsCLI && revertTsxFiles) {
      relinka("info-verbose", "Reverting .tsx files...");
      await renameTxtToTsx(outputDir);
    }

    // 9) If installDeps is true, install dependencies
    if (pkgIsCLI && cliInstallDeps) {
      relinka("info", "Installing dependencies...");
      await installDependencies({
        cwd: outputDir,
        silent: false,
      });
    }

    // 10) Notify user that the download is complete
    relinka(
      "success",
      `All files for @${scope}/${packageName} downloaded successfully.`,
      pkgIsCLI
        ? `Use "bun ${outputDir}/bin/main.ts" to use it (short command is coming soon).`
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
