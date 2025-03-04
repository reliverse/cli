import {
  multiselectPrompt,
  confirmPrompt,
  selectPrompt,
  relinka,
} from "@reliverse/prompts";
import { destr } from "destr";
import fs from "fs-extra";
import path from "pathe";

import type { BaseConfig } from "~/types.js";

import { removeComments } from "~/utils/codemods/removeComments.js";
import { getUnusedDependencies } from "~/utils/codemods/removeUnusedDeps.js";
import { readReliverseConfig } from "~/utils/reliverseConfig.js";

import { uninstallDependencies } from "./dependencies.js";

type KnipConfig = BaseConfig & {
  $schema: string;
  entry?: string[];
  project?: string[];
  ignore: string[];
  ignoreDependencies?: string[];
  rules: Record<string, "error" | "warn" | "off">;
};

const defaultIgnoredDeps: string[] = [
  // TODO: add default dependencies to ignore
];

export async function handleCleanup(
  cwd: string,
  configPath: string,
  isDev: boolean,
) {
  const ignoredDeps = new Set<string>(defaultIgnoredDeps);

  // Try to read Knip config for ignoreDependencies
  try {
    const knipConfigPath = path.join(cwd, "knip.json");
    if (await fs.pathExists(knipConfigPath)) {
      const knipConfig = destr<KnipConfig>(
        await fs.readFile(knipConfigPath, "utf-8"),
      );
      if (knipConfig?.ignoreDependencies) {
        knipConfig.ignoreDependencies.forEach((dep) => ignoredDeps.add(dep));
      }
    }
  } catch (error) {
    relinka(
      "warn-verbose",
      "Error reading Knip config:",
      error instanceof Error ? error.message : String(error),
    );
  }

  // Read ignoreDependencies from the active config file
  try {
    const rules = await readReliverseConfig(configPath, isDev);
    if (rules?.ignoreDependencies) {
      rules.ignoreDependencies.forEach((dep) => ignoredDeps.add(dep));
    }
  } catch (error) {
    relinka(
      "warn-verbose",
      `Error reading ${configPath}:`,
      error instanceof Error ? error.message : String(error),
    );
  }

  const action = await selectPrompt({
    title: "Select cleanup action:",
    options: [
      {
        label: "Remove all comments",
        value: "comments",
        hint: "Remove comments from all TypeScript/JavaScript files",
      },
      {
        label: "Remove unused dependencies",
        value: "dependencies",
        hint: "Remove packages that aren't imported anywhere",
      },
    ],
  });

  if (action === "comments") {
    const confirm = await confirmPrompt({
      title: "Remove all comments from TypeScript/JavaScript files?",
      content: "This action cannot be undone.",
      defaultValue: false,
    });

    if (confirm) {
      await removeComments(cwd);
    }
  } else if (action === "dependencies") {
    const unusedDeps = await getUnusedDependencies(
      cwd,
      Array.from(ignoredDeps),
    );

    if (unusedDeps.length === 0) {
      relinka("info", "No unused dependencies found!");
      return;
    }

    const depsToRemove = await multiselectPrompt({
      title: "Select dependencies to remove:",
      options: unusedDeps.map((dep) => ({
        label: dep,
        value: dep,
      })),
    });

    if (depsToRemove.length > 0) {
      await uninstallDependencies(cwd, depsToRemove);
      relinka("success", `Removed ${depsToRemove.length} unused dependencies`);
    }
  }
}
