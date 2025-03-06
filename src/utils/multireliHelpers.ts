import fs from "fs-extra";
import path from "pathe";

// Check if the directory contains any .jsonc or .ts files (excluding *.gen.cfg.* files)
export async function hasConfigFiles(projectPath: string): Promise<boolean> {
  try {
    const files = await fs.readdir(projectPath);
    return files.some(
      (file) =>
        (file.endsWith(".jsonc") || file.endsWith(".ts")) &&
        !file.includes("gen.cfg"),
    );
  } catch (_err) {
    return false;
  }
}

/**
 * Checks if the given project path is a MultiReli project
 * @param projectPath The path to the project to check
 */
export async function isMultireliProject(
  projectPath: string,
): Promise<boolean> {
  const multireliFolderPath = path.join(projectPath, "multireli");
  return (
    (await fs.pathExists(multireliFolderPath)) &&
    (await hasConfigFiles(multireliFolderPath))
  );
}
