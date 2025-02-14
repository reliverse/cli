import type { PackageJson } from "pkg-types";

import { destr } from "destr";
import fs from "fs-extra";
import path from "pathe";
import { glob } from "tinyglobby";

export async function getUnusedDependencies(
  cwd: string,
  ignoredDeps: string[] = [],
): Promise<string[]> {
  const packageJsonPath = path.join(cwd, "package.json");
  const packageJson = destr<PackageJson>(
    await fs.readFile(packageJsonPath, "utf-8"),
  );
  const allDeps = {
    ...(packageJson.dependencies ?? {}),
    ...(packageJson.devDependencies ?? {}),
  };

  // Get all JS/TS files
  const files = await glob("**/*.{js,jsx,ts,tsx}", { cwd });
  const imports = new Set<string>();

  // Collect all imports
  for (const file of files) {
    const content = await fs.readFile(path.join(cwd, file), "utf-8");
    const importMatches = content.matchAll(/from ['"]([^'"]+)['"]/g);
    for (const match of importMatches) {
      const [, pkg] = match as RegExpMatchArray;
      if (pkg && !pkg.startsWith(".") && !pkg.startsWith("~/")) {
        // @ts-expect-error TODO: fix strictNullChecks undefined
        imports.add(pkg.split("/")[0]); // Get root package name
      }
    }
  }

  // Filter unused dependencies
  return Object.keys(allDeps).filter(
    (dep) =>
      !imports.has(dep) &&
      !ignoredDeps.some((pattern) =>
        pattern.startsWith("/")
          ? new RegExp(pattern.slice(1, -1)).test(dep)
          : pattern === dep,
      ),
  );
}
