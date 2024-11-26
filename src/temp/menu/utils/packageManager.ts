import { execa, execaCommand } from "execa";
import { spawnSync } from "node:child_process";
import { detectPackageManager } from "nypm";

import { promptForPackageManager } from "../askPackageManager.js";

const isBun = typeof globalThis.Bun !== "undefined";

// Supported package managers
export const PACKAGE_MANAGERS = {
  bun: "bun",
  pnpm: "pnpm",
  yarn: "yarn",
  npm: "npm",
} as const;

export type PackageManagerKey = keyof typeof PACKAGE_MANAGERS;

export async function getBunVersion(): Promise<string> {
  try {
    if (isBun) {
      const result = Bun.spawnSync({ cmd: ["bun", "--version"] });
      const output = new TextDecoder().decode(result.stdout);
      const versionMatch = /(\d+\.\d+\.\d+)/.exec(output);
      return versionMatch?.[1] ?? "unknown";
    }
    const output = spawnSync("bun", ["--version"], { encoding: "utf-8" });
    const versionMatch = /(\d+\.\d+\.\d+)/.exec(output.stdout);
    return versionMatch?.[1] ?? "unknown";
  } catch {
    return "not installed";
  }
}

export async function getPnpmVersion(): Promise<string> {
  const result = await execa("pnpm", ["--version"]);
  return result.stdout;
}

// A placeholder function for installing dependencies
export async function installDeps({
  npmClient,
  cwd,
}: { npmClient: string; cwd: string }) {
  await execaCommand(`${npmClient} install`, { cwd, stdio: "inherit" });
}

export async function installWithNpmClient({
  npmClient,
  cwd,
}: { npmClient: string; cwd: string }) {
  if (npmClient === "pnpm" && /^8\.[0-6]\./.test(await getPnpmVersion())) {
    // to avoid pnpm 8.0 ~ 8.6 installing minimal versions of dependencies
    await execaCommand("pnpm up -L", { cwd, stdio: "inherit" });
  } else {
    await installDeps({ npmClient, cwd });
  }
}

export async function getPackageManagerVersion(pm: string): Promise<string> {
  try {
    const result = await execa(pm, ["--version"]);
    const versionMatch = /(\d+\.\d+\.\d+)/.exec(result.stdout);
    return versionMatch?.[1] ?? "unknown";
  } catch {
    return "not installed";
  }
}

export async function getPackageManager(args: string[], cwd: string) {
  const preferredPMFlag = args.find((arg) => arg.startsWith("--use-"));
  const preferredPM = preferredPMFlag
    ? (preferredPMFlag.replace("--use-", "") as PackageManagerKey)
    : await promptForPackageManager();

  const pmInfo = await detectPackageManager(cwd);
  const pmName = preferredPM || pmInfo?.name || "unknown";
  let pmVersion = pmInfo?.version?.slice(0, 6) || "";

  if (pmName === "bun" && isBun) {
    pmVersion = pmVersion || (await getBunVersion());
  } else if (pmName === "pnpm") {
    pmVersion = pmVersion || (await getPnpmVersion());
  }

  // TODO: fix this temporary hardcoded version check
  if ((pmVersion === "9.12.2" || pmVersion === "v9.12.2") && pmName === "bun") {
    pmVersion = await getBunVersion();
  }

  return { pmName, pmVersion };
}
