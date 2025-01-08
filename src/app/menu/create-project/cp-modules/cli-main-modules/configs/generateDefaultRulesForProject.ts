import { safeDestr } from "destr";
import fs from "fs-extra";
import path from "pathe";

import type { ReliverseConfig } from "~/types.js";

import { relinka } from "../handlers/logger.js";
import { detectProjectType } from "./miscellaneousConfigHelpers.js";
import { getDefaultReliverseConfig } from "./reliverseReadWrite.js";

export async function generateDefaultRulesForProject(
  cwd: string,
): Promise<ReliverseConfig | null> {
  const projectType = await detectProjectType(cwd);
  if (!projectType) {
    return null;
  }

  const packageJsonPath = path.join(cwd, "package.json");
  let packageJson: any = {};
  try {
    if (await fs.pathExists(packageJsonPath)) {
      packageJson = safeDestr(await fs.readFile(packageJsonPath, "utf-8"));
    }
  } catch (error) {
    relinka(
      "error",
      "Error reading package.json:",
      error instanceof Error ? error.message : String(error),
    );
  }

  const rules = await getDefaultReliverseConfig(
    (packageJson.name as string) ?? path.basename(cwd),
    (packageJson.author as string) ?? "user",
    projectType,
  );

  // Detect additional features
  const hasI18n = await fs.pathExists(path.join(cwd, "src/app/[locale]"));
  const hasPrisma = await fs.pathExists(path.join(cwd, "prisma/schema.prisma"));
  const hasDrizzle = await fs.pathExists(path.join(cwd, "drizzle.config.ts"));
  const hasNextAuth = await fs.pathExists(
    path.join(cwd, "src/app/api/auth/[...nextauth]"),
  );
  const hasClerk = packageJson.dependencies?.["@clerk/nextjs"];

  if (!rules.experimental) {
    rules.experimental = {};
  }

  rules.experimental.features = {
    ...rules.experimental.features,
    i18n: hasI18n,
    database: hasPrisma ?? hasDrizzle,
    authentication: hasNextAuth ?? !!hasClerk,
    analytics: false,
    themeMode: "dark-light",
    api: false,
    testing: false,
    docker: false,
    ci: false,
    commands: [],
    webview: [],
    language: [],
    themes: [],
  };

  if (!rules.experimental.preferredLibraries) {
    rules.experimental.preferredLibraries = {};
  }

  if (hasPrisma) {
    rules.experimental.preferredLibraries.database = "prisma";
  } else if (hasDrizzle) {
    rules.experimental.preferredLibraries.database = "drizzle";
  }

  if (hasNextAuth) {
    rules.experimental.preferredLibraries.authentication = "next-auth";
  } else if (hasClerk) {
    rules.experimental.preferredLibraries.authentication = "clerk";
  }

  return rules;
}
