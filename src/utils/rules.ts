import fs from "fs-extra";
import path from "pathe";

import type { ReliverseRules } from "~/types/rules.js";

import { relinka } from "./console.js";

export async function writeReliverseRules(
  targetDir: string,
  rules: ReliverseRules,
): Promise<void> {
  try {
    const rulesPath = path.join(targetDir, ".reliverserules");
    await fs.writeJSON(rulesPath, rules, { spaces: 2 });
    relinka("info-verbose", "Project rules saved to .reliverserules");
  } catch (error) {
    relinka(
      "error",
      "Error saving project rules:",
      error instanceof Error ? error.message : String(error),
    );
  }
}

export async function readReliverseRules(
  targetDir: string,
): Promise<ReliverseRules | null> {
  try {
    const rulesPath = path.join(targetDir, ".reliverserules");
    if (await fs.pathExists(rulesPath)) {
      return await fs.readJSON(rulesPath);
    }
  } catch (error) {
    relinka(
      "error",
      "Error reading project rules:",
      error instanceof Error ? error.message : String(error),
    );
  }
  return null;
}

export function getDefaultRules(
  appName: string,
  appAuthor: string,
  framework: ReliverseRules["framework"] = "nextjs",
): ReliverseRules {
  return {
    appName,
    appAuthor,
    framework,
    packageManager: "bun",
    preferredLibraries: {
      stateManagement: "zustand",
      formManagement: "react-hook-form",
      styling: "tailwind",
      uiComponents: "shadcn-ui",
      testing: "jest",
      authentication: "next-auth",
      database: "prisma",
      api: "trpc",
    },
    codeStyle: {
      dontRemoveComments: true,
      shouldAddComments: true,
      typeOrInterface: "type",
      importOrRequire: "import",
      quoteMark: "single",
      semicolons: true,
      maxLineLength: 80,
      indentStyle: "space",
      indentSize: 2,
      importSymbol: [
        {
          from: "~/utils/console",
          to: "@/utils/console",
          description: "Update import path to use @/ instead of ~/",
        },
      ],
    },
    features: {
      i18n: false,
      pwa: false,
      seo: true,
      analytics: false,
      darkMode: true,
      authentication: false,
      authorization: false,
      api: true,
      database: true,
      testing: true,
      storybook: false,
      docker: false,
      ci: true,
    },
  };
}
