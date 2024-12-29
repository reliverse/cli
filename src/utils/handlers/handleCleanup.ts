import { multiselectPrompt } from "@reliverse/prompts";
import { confirmPrompt, selectPrompt } from "@reliverse/prompts";
import { destr } from "destr";
import fs from "fs-extra";
import path from "pathe";

import type { KnipConfig } from "~/types.js";

import { readReliverseConfig } from "../configs/reliverseReadWrite.js";
import { relinka } from "../console.js";
import { uninstallDependencies } from "../dependencies.js";
import { removeComments } from "./codemods/removeComments.js";
import { getUnusedDependencies } from "./codemods/removeUnusedDeps.js";

export async function handleCleanup(cwd: string) {
  // Try to read Knip config for ignoreDependencies
  let ignoredDeps: string[] = [];
  try {
    const knipConfigPath = path.join(cwd, "knip.json");
    if (await fs.pathExists(knipConfigPath)) {
      const knipConfig = destr<KnipConfig>(
        await fs.readFile(knipConfigPath, "utf-8"),
      );
      ignoredDeps = knipConfig.ignoreDependencies ?? [];
    }
  } catch (error) {
    relinka(
      "warn-verbose",
      "Error reading Knip config:",
      error instanceof Error ? error.message : String(error),
    );
  }

  // Read ignoreDependencies from .reliverse if exists
  try {
    const rules = await readReliverseConfig(cwd);
    if (rules?.experimental?.ignoreDependencies) {
      ignoredDeps = [
        ...new Set([...ignoredDeps, ...rules.experimental.ignoreDependencies]),
      ];
    }
  } catch (error) {
    relinka(
      "warn-verbose",
      "Error reading .reliverse:",
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
    const unusedDeps = await getUnusedDependencies(cwd, ignoredDeps);

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
