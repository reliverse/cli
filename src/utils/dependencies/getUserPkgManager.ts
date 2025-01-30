import { execa } from "execa";
import fs from "fs-extra";
import path from "pathe";

export type PackageManager = "npm" | "pnpm" | "yarn" | "bun";
export type DetectionSource =
  | "runtime"
  | "env"
  | "lockfile"
  | "config"
  | "default"
  | "system"
  | "global";

export type PkgManagerInfo = {
  packageManager: PackageManager;
  source: DetectionSource;
  version?: string;
};

export type DetectOptions = {
  cwd?: string;
  includeGlobalBun?: boolean;
};

// Cache for detection results with more specific keys
const cache = new Map<string>();

/**
 * Check if a path exists
 */
async function pathExists(p: string): Promise<boolean> {
  try {
    await fs.access(p);
    return true;
  } catch {
    return false;
  }
}

/**
 * Check if a package manager is available globally by running its version command
 */
async function checkPMVersion(
  pm: PackageManager,
  includeGlobalBun = true,
): Promise<string | null> {
  if (pm === "bun" && !includeGlobalBun) return null;

  const cacheKey = `has_global_${pm}`;
  if (cache.has(cacheKey)) {
    return cache.get(cacheKey) as string | null;
  }

  try {
    const { stdout } = await execa(pm, ["--version"]);
    if (/^\d+.\d+.\d+$/.test(stdout)) {
      cache.set(cacheKey, stdout);
      return stdout;
    }
  } catch (_error) {
    cache.set(cacheKey, null);
  }
  return null;
}

/**
 * Check for lock files in the directory
 */
async function detectLockFile(
  projectPath: string,
): Promise<PkgManagerInfo | null> {
  const cacheKey = `lockfile_${projectPath}`;
  if (cache.has(cacheKey)) {
    return cache.get(cacheKey) as PkgManagerInfo | null;
  }

  const lockFiles = await Promise.all([
    pathExists(path.join(projectPath, "yarn.lock")),
    pathExists(path.join(projectPath, "package-lock.json")),
    pathExists(path.join(projectPath, "pnpm-lock.yaml")),
    pathExists(path.join(projectPath, "bun.lock")),
  ]);

  let result: PkgManagerInfo | null = null;
  const [isYarn, isNpm, isPnpm, isBun] = lockFiles;

  if (isBun) {
    const version = await checkPMVersion("bun");
    result = {
      packageManager: "bun",
      source: "lockfile",
      ...(version && { version }),
    };
  } else if (isPnpm) {
    const version = await checkPMVersion("pnpm");
    result = {
      packageManager: "pnpm",
      source: "lockfile",
      ...(version && { version }),
    };
  } else if (isYarn) {
    const version = await checkPMVersion("yarn");
    result = {
      packageManager: "yarn",
      source: "lockfile",
      ...(version && { version }),
    };
  } else if (isNpm) {
    const version = await checkPMVersion("npm");
    result = {
      packageManager: "npm",
      source: "lockfile",
      ...(version && { version }),
    };
  }

  cache.set(cacheKey, result);
  return result;
}

/**
 * Detects all package managers present in the directory
 */
async function detectPackageManagers(
  projectPath: string,
  options: DetectOptions = {},
): Promise<PkgManagerInfo[]> {
  const cacheKey = `detect_${projectPath}_${options.includeGlobalBun}`;
  if (cache.has(cacheKey)) {
    return cache.get(cacheKey) as PkgManagerInfo[];
  }

  const detected: PkgManagerInfo[] = [];

  // 1. Check lock files first (highest priority)
  const lockFileResult = await detectLockFile(projectPath);
  if (lockFileResult) {
    detected.push(lockFileResult);
  }

  // 2. Runtime detection
  try {
    const { stdout } = await execa("bun", ["--version"]);
    if (stdout) {
      detected.push({
        packageManager: "bun",
        source: "runtime",
        version: stdout.trim(),
      });
    }
  } catch {
    // Ignore if bun is not available
  }

  // 3. Environment detection
  const pkgManagerUserAgent = process.env["npm_config_user_agent"] ?? "";
  if (pkgManagerUserAgent.startsWith("yarn")) {
    detected.push({ packageManager: "yarn", source: "env" });
  } else if (pkgManagerUserAgent.startsWith("pnpm")) {
    detected.push({ packageManager: "pnpm", source: "env" });
  } else if (pkgManagerUserAgent.startsWith("bun")) {
    detected.push({ packageManager: "bun", source: "env" });
  }

  // 4. Config files detection
  const configFiles = await Promise.all([
    pathExists(path.join(projectPath, ".npmrc")),
    pathExists(path.join(projectPath, ".yarnrc")),
    pathExists(path.join(projectPath, ".yarnrc.yml")),
    pathExists(path.join(projectPath, ".pnpmfile.cjs")),
    pathExists(path.join(projectPath, ".pnpmfile.js")),
    pathExists(path.join(projectPath, "bunfig.toml")),
  ]);

  const [
    hasNpmrc,
    hasYarnrc,
    hasYarnrcYml,
    hasPnpmfileCjs,
    hasPnpmfileJs,
    hasBunConfig,
  ] = configFiles;

  if (hasNpmrc) detected.push({ packageManager: "npm", source: "config" });
  if (hasYarnrc || hasYarnrcYml)
    detected.push({ packageManager: "yarn", source: "config" });
  if (hasPnpmfileCjs || hasPnpmfileJs)
    detected.push({ packageManager: "pnpm", source: "config" });
  if (hasBunConfig) detected.push({ packageManager: "bun", source: "config" });

  // 5. Version check detection (async)
  const versionChecks = await Promise.all([
    checkPMVersion("npm"),
    checkPMVersion("pnpm"),
    checkPMVersion("yarn"),
    checkPMVersion("bun", options.includeGlobalBun),
  ]);

  const pmList = ["npm", "pnpm", "yarn", "bun"] as const;
  pmList.forEach((pm, index) => {
    const version = versionChecks[index];
    if (version) {
      detected.push({
        packageManager: pm,
        source: "global",
        version,
      });
    }
  });

  cache.set(cacheKey, detected);
  return detected;
}

/**
 * Clear the detection cache
 */
export function clearCache(): void {
  cache.clear();
}

export async function getUserPkgManager(
  projectPath?: string,
  options: DetectOptions = {},
): Promise<PkgManagerInfo> {
  const defaultPM: PkgManagerInfo = {
    packageManager: "npm",
    source: "default",
  };

  const priorityOrder: PackageManager[] = ["bun", "pnpm", "yarn", "npm"];

  if (projectPath) {
    try {
      const detected = await detectPackageManagers(projectPath, options);
      if (detected.length === 0) return defaultPM;

      return (
        priorityOrder.reduce<PkgManagerInfo | null>((selected, pm) => {
          if (selected) return selected;
          return detected.find((d) => d.packageManager === pm) ?? null;
        }, null) ??
        detected[0] ??
        defaultPM
      );
    } catch (error) {
      console.error("Error detecting package manager:", error);
      return defaultPM;
    }
  }

  let currentDir = process.cwd();
  const { root } = path.parse(currentDir);

  while (currentDir !== root) {
    const detected = await detectPackageManagers(currentDir, options);
    if (detected.length > 0) {
      return (
        priorityOrder.reduce<PkgManagerInfo | null>((selected, pm) => {
          if (selected) return selected;
          return detected.find((d) => d.packageManager === pm) ?? null;
        }, null) ??
        detected[0] ??
        defaultPM
      );
    }
    currentDir = path.dirname(currentDir);
  }

  return defaultPM;
}

export async function getAllPkgManagers(
  projectPath: string,
  options: DetectOptions = {},
): Promise<PkgManagerInfo[]> {
  try {
    const detected = await detectPackageManagers(projectPath, options);
    return detected.length > 0
      ? detected
      : [{ packageManager: "npm", source: "default" }];
  } catch (error) {
    console.error("Error detecting package managers:", error);
    return [{ packageManager: "npm", source: "default" }];
  }
}
