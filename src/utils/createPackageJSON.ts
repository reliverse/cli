import { relinka } from "@reliverse/prompts";
import fs from "fs-extra";
import path from "pathe";
import { definePackageJSON, writePackageJSON } from "pkg-types";

/**
 * Creates a package.json file for a new project using pkg-types
 * @param projectPath Path where the package.json should be created
 * @param projectName Name of the project
 */
export async function createPackageJSON(
  projectPath: string,
  projectName: string,
  isLib: boolean,
): Promise<void> {
  const packageJson = definePackageJSON({
    name: projectName,
    version: "0.1.0",
    description: `${projectName} is built with ❤️ by @reliverse/cli`,
    type: "module",
    ...(isLib ? {} : { private: true }),
  });
  const packageJsonPath = path.join(projectPath, "package.json");
  await writePackageJSON(packageJsonPath, packageJson);

  // Format the package.json file with proper indentation
  const content = await fs.readFile(packageJsonPath, "utf-8");
  const formatted = JSON.stringify(JSON.parse(content), null, 2);
  await fs.writeFile(packageJsonPath, formatted, "utf-8");

  relinka(
    "info",
    `Created package.json with ${isLib ? "library" : "application"} configuration`,
  );
}
