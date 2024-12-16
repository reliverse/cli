import {
  confirmPrompt,
  selectPrompt,
  multiselectPrompt,
} from "@reliverse/prompts";
import fs from "fs-extra";
import path from "pathe";

import type { ReliverseConfig } from "~/types.js";

import { readReliverseMemory } from "~/args/memory/impl.js";
import { generateDefaultRulesForProject } from "~/utils/configs/generateDefaultRulesForProject.js";
import { detectProjectType } from "~/utils/configs/miscellaneousConfigHelpers.js";
import {
  readReliverseConfig,
  writeReliverseConfig,
} from "~/utils/configs/reliverseReadWrite.js";
import { validateAndInsertMissingKeys } from "~/utils/configs/validateAndInsertMissingKeys.js";
import { relinka } from "~/utils/console.js";
import { getCurrentWorkingDirectory } from "~/utils/fs.js";
import {
  convertPrismaToDrizzle,
  convertDatabaseProvider,
} from "~/utils/handlers/codemods/convertDatabase.js";
import { handleCleanup } from "~/utils/handlers/handleCleanup.js";
import { handleCodemods } from "~/utils/handlers/handleCodemods.js";
import { handleConfigEditing } from "~/utils/handlers/handleConfigEdits.js";
import { handleIntegrations } from "~/utils/handlers/handleIntegrations.js";
import {
  readShadcnConfig,
  getInstalledComponents,
  installComponent,
  removeComponent,
  updateComponent,
  applyTheme,
  AVAILABLE_COMPONENTS,
  THEMES,
} from "~/utils/shadcn.js";

import { getMainMenuOptions } from "./appMainMenuOptions.js";
import { buildBrandNewThing } from "./buildBrandNewThing.js";
import {
  randomReliverseMenuTitle,
  randomWelcomeMessages,
} from "./data/messages.js";
import { manageDrizzleSchema } from "./manageDrizzleSchema.js";
import { showEndPrompt, showStartPrompt } from "./showStartEndPrompt.js";

export async function app({
  isDev,
  config,
}: { isDev: boolean; config: ReliverseConfig }) {
  const cwd = getCurrentWorkingDirectory();

  // Validate and insert missing keys in reliverse.json if it exists
  await validateAndInsertMissingKeys(cwd);

  if (isDev) {
    const testsRuntimePath = path.join(cwd, "tests-runtime");
    if (await fs.pathExists(testsRuntimePath)) {
      const shouldRemoveTestsRuntime = await confirmPrompt({
        title: "[--dev] Do you want to remove the entire tests-runtime folder?",
      });
      if (shouldRemoveTestsRuntime) {
        await fs.remove(testsRuntimePath);
      }
    }
  }

  await showStartPrompt();

  // Check for reliverse.json and project type
  let rules = await readReliverseConfig(cwd);
  const projectType = await detectProjectType(cwd);

  // If no rules file exists but we detected a project type, generate default rules
  if (!rules && projectType) {
    rules = await generateDefaultRulesForProject(cwd);
    if (rules) {
      await writeReliverseConfig(cwd, rules);
      relinka(
        "success",
        "Generated reliverse.json based on detected project type. Please review it and adjust as needed.",
      );
    }
  }

  const options = await getMainMenuOptions(cwd);
  const memory = await readReliverseMemory();
  const choice = await selectPrompt({
    terminalWidth: 120,
    title: `🤖 ${
      memory.name && memory.name !== "missing"
        ? randomWelcomeMessages(memory.name)[
            Math.floor(
              Math.random() * randomWelcomeMessages(memory.name).length,
            )
          ]
        : ""
    } ${
      randomReliverseMenuTitle[
        Math.floor(Math.random() * randomReliverseMenuTitle.length)
      ]
    }`,
    titleColor: "retroGradient",
    options,
  });

  if (choice === "create") {
    await buildBrandNewThing(isDev, config);
  } else if (choice === "codemods" && rules) {
    await handleCodemods(rules, cwd);
  } else if (choice === "integration" && rules) {
    await handleIntegrations(cwd);
  } else if (choice === "convert-db" && rules) {
    const conversionType = await selectPrompt({
      title: "What kind of conversion would you like to perform?",
      options: [
        { label: "Convert from Prisma to Drizzle", value: "prisma-to-drizzle" },
        { label: "Convert database provider", value: "change-provider" },
      ],
    });

    if (conversionType === "prisma-to-drizzle") {
      const targetDb = await selectPrompt({
        title: "Select target database type:",
        options: [
          { label: "PostgreSQL", value: "postgres" },
          { label: "MySQL", value: "mysql" },
          { label: "SQLite", value: "sqlite" },
        ],
      });

      await convertPrismaToDrizzle(cwd, targetDb);
    } else if (conversionType === "change-provider") {
      const fromProvider = await selectPrompt({
        title: "Convert from:",
        options: [
          { label: "PostgreSQL", value: "postgres" },
          { label: "MySQL", value: "mysql" },
          { label: "SQLite", value: "sqlite" },
        ],
      });

      const toProviderOptions = [
        { label: "PostgreSQL", value: "postgres" },
        { label: "MySQL", value: "mysql" },
        { label: "SQLite", value: "sqlite" },
      ];

      // LibSQL as an option when converting from PostgreSQL
      if (fromProvider === "postgres") {
        toProviderOptions.push({ label: "LibSQL/Turso", value: "libsql" });
      }

      const toProvider = await selectPrompt({
        title: "Convert to:",
        options: toProviderOptions.filter((opt) => opt.value !== fromProvider),
      });

      await convertDatabaseProvider(cwd, fromProvider, toProvider);
    }
  } else if (choice === "shadcn") {
    const shadcnConfig = await readShadcnConfig(cwd);
    if (!shadcnConfig) {
      relinka("error", "shadcn/ui configuration not found");
      return;
    }

    const action = await selectPrompt({
      title: "What would you like to do?",
      options: [
        { label: "Add Components", value: "add" },
        { label: "Remove Components", value: "remove" },
        { label: "Update Components", value: "update" },
        { label: "Change Theme", value: "theme" },
      ],
    });

    if (action === "add") {
      const installedComponents = await getInstalledComponents(
        cwd,
        shadcnConfig,
      );
      const availableComponents = AVAILABLE_COMPONENTS.filter(
        (c) => !installedComponents.includes(c),
      );

      const components = await multiselectPrompt({
        title: "Select components to add:",
        options: availableComponents.map((c) => ({
          label: c,
          value: c,
        })),
      });

      for (const component of components) {
        await installComponent(cwd, component);
      }
    } else if (action === "remove") {
      const installedComponents = await getInstalledComponents(
        cwd,
        shadcnConfig,
      );

      const components = await multiselectPrompt({
        title: "Select components to remove:",
        options: installedComponents.map((c) => ({
          label: c,
          value: c,
        })),
      });

      for (const component of components) {
        await removeComponent(cwd, shadcnConfig, component);
      }
    } else if (action === "update") {
      const installedComponents = await getInstalledComponents(
        cwd,
        shadcnConfig,
      );

      const components = await multiselectPrompt({
        title: "Select components to update:",
        options: installedComponents.map((c) => ({
          label: c,
          value: c,
        })),
      });

      for (const component of components) {
        await updateComponent(cwd, component);
      }
    } else if (action === "theme") {
      const theme = await selectPrompt({
        title: "Select a theme:",
        options: THEMES.map((t) => ({
          label: t.name,
          value: t.name,
        })),
      });

      const selectedTheme = THEMES.find((t) => t.name === theme);
      if (selectedTheme) {
        await applyTheme(cwd, shadcnConfig, selectedTheme);
      }
    }
  } else if (choice === "drizzle-schema") {
    await manageDrizzleSchema(cwd);
  } else if (choice === "cleanup") {
    await handleCleanup(cwd);
  } else if (choice === "edit-config") {
    await handleConfigEditing(cwd);
  }

  await showEndPrompt();
  process.exit(0);
}
