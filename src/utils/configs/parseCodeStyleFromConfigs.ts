import type { TSConfig } from "pkg-types";

import { safeDestr } from "destr";
import fs from "fs-extra";
import path from "pathe";

import type { ReliverseConfig } from "~/types.js";

import { relinka } from "../console.js";

export async function parseCodeStyleFromConfigs(
  cwd: string,
): Promise<Partial<ReliverseConfig>> {
  const codeStyle: any = {};

  // Try to read TypeScript config
  try {
    const tsConfigPath = path.join(cwd, "tsconfig.json");
    if (await fs.pathExists(tsConfigPath)) {
      const tsConfig = safeDestr<TSConfig>(
        await fs.readFile(tsConfigPath, "utf-8"),
      );

      if (tsConfig?.compilerOptions) {
        const { compilerOptions } = tsConfig;

        // Detect strict mode settings
        codeStyle.strictMode = {
          enabled: compilerOptions.strict ?? false,
          noImplicitAny: compilerOptions.noImplicitAny ?? false,
          strictNullChecks: compilerOptions.strictNullChecks ?? false,
        };

        // Detect module settings
        if (
          (compilerOptions.module as string)?.toLowerCase().includes("node")
        ) {
          codeStyle.importOrRequire = "esm";
        }
      }
    }
  } catch (error) {
    relinka(
      "warn-verbose",
      "Error parsing TypeScript config:",
      error instanceof Error ? error.message : String(error),
    );
  }

  return { experimental: { codeStyle } };
}
