import type { PackageJson } from "pkg-types";

import destr from "destr";
import fs from "fs-extra";
import { exec } from "node:child_process";
import path from "pathe";

export async function installDependencies(
  cwd: string,
  dependencies: string[],
): Promise<void> {
  const packageManager = (await fs.pathExists(path.join(cwd, "yarn.lock")))
    ? "yarn"
    : (await fs.pathExists(path.join(cwd, "pnpm-lock.yaml")))
      ? "pnpm"
      : "npm";

  const installCmd =
    packageManager === "npm"
      ? `npm install -D ${dependencies.join(" ")}`
      : packageManager === "yarn"
        ? `yarn add -D ${dependencies.join(" ")}`
        : `pnpm add -D ${dependencies.join(" ")}`;

  await new Promise<void>((resolve, reject) => {
    exec(installCmd, { cwd }, (error: Error | null) => {
      if (error) {
        reject(error);
      } else {
        resolve();
      }
    });
  });
}

// Function to get current dependencies
export async function getCurrentDependencies(
  cwd: string,
): Promise<Record<string, string>> {
  const packageJsonPath = path.join(cwd, "package.json");
  if (await fs.pathExists(packageJsonPath)) {
    const packageJson = destr<PackageJson>(
      await fs.readFile(packageJsonPath, "utf-8"),
    );
    return {
      ...(packageJson.dependencies || {}),
      ...(packageJson.devDependencies || {}),
    };
  }
  return {};
}

// Function to uninstall dependencies
export async function uninstallDependencies(
  cwd: string,
  dependencies: string[],
): Promise<void> {
  if (dependencies.length === 0) {
    return;
  }

  const packageManager = (await fs.pathExists(path.join(cwd, "yarn.lock")))
    ? "yarn"
    : (await fs.pathExists(path.join(cwd, "pnpm-lock.yaml")))
      ? "pnpm"
      : "npm";

  const uninstallCmd =
    packageManager === "npm"
      ? `npm uninstall ${dependencies.join(" ")}`
      : packageManager === "yarn"
        ? `yarn remove ${dependencies.join(" ")}`
        : `pnpm remove ${dependencies.join(" ")}`;

  await new Promise<void>((resolve, reject) => {
    exec(uninstallCmd, { cwd }, (error: Error | null) => {
      if (error) {
        reject(error);
      } else {
        resolve();
      }
    });
  });
}
