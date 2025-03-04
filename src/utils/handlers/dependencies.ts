import fs from "fs-extra";
import { exec } from "node:child_process";
import path from "pathe";

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
