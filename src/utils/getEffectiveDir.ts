import path from "pathe";

import type { GitModParams } from "~/app/app-types.js";

/**
 * Gets the effective directory path based on dev mode and project settings
 */
export function getEffectiveDir({
  cwd,
  isDev,
  projectPath,
  projectName,
}: GitModParams): string {
  return isDev ? path.join(cwd, "tests-runtime", projectName) : projectPath;
}
