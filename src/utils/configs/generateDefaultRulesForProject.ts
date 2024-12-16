import { safeDestr } from "destr";
import fs from "fs-extra";
import path from "pathe";

import type { ReliverseConfig } from "~/types.js";

import { relinka } from "../console.js";
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
    relinka("error", "Error reading package.json:", error.toString());
  }

  const rules = await getDefaultReliverseConfig(
    packageJson.name || path.basename(cwd),
    packageJson.author || "user",
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

  rules.features = {
    ...rules.features,
    i18n: hasI18n,
    database: hasPrisma || hasDrizzle,
    authentication: hasNextAuth || !!hasClerk,
  };

  if (hasPrisma) {
    rules.preferredLibraries.database = "prisma";
  } else if (hasDrizzle) {
    rules.preferredLibraries.database = "drizzle";
  }

  if (hasNextAuth) {
    rules.preferredLibraries.authentication = "next-auth";
  } else if (hasClerk) {
    rules.preferredLibraries.authentication = "clerk";
  }

  return rules;
}
