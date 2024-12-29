import type { TSConfig } from "pkg-types";

import { confirmPrompt, selectPrompt } from "@reliverse/prompts";
import { destr } from "destr";
import fs from "fs-extra";
import path from "pathe";

import { ESLINT_PRESETS } from "../configs/configsPresets.js";
import { detectConfigFiles } from "../configs/miscellaneousConfigHelpers.js";
import { relinka } from "../console.js";
import {
  getCurrentDependencies,
  installDependencies,
  uninstallDependencies,
} from "../dependencies.js";

export async function handleConfigEditing(cwd: string) {
  const detectedConfigs = await detectConfigFiles(cwd);

  if (detectedConfigs.length === 0) {
    relinka("info", "No configuration files detected.");
    return;
  }

  const selectedConfig = await selectPrompt({
    title: "Select configuration to edit:",
    options: detectedConfigs.map((config) => ({
      label: config.name,
      value: config.name,
      hint: `Edit ${config.name} configuration`,
    })),
  });

  const config = detectedConfigs.find((c) => c.name === selectedConfig);
  if (!config) {
    return;
  }

  // Find the actual file that exists
  let configFile: string | null = null;
  for (const file of config.files) {
    if (await fs.pathExists(path.join(cwd, file))) {
      configFile = file;
      break;
    }
  }

  if (!configFile) {
    relinka("error", `Could not find ${config.name} configuration file.`);
    return;
  }

  // Read current config
  const content = await fs.readFile(path.join(cwd, configFile), "utf-8");

  // TODO: Add specific prompts for each config type
  switch (config.name) {
    case "ESLint": {
      const action = await selectPrompt({
        title: "What would you like to do?",
        options: [
          { label: "Use preset configuration", value: "preset" },
          { label: "Edit current configuration", value: "edit" },
        ],
      });

      if (action === "preset") {
        const preset = await selectPrompt({
          title: "Select ESLint preset:",
          options: Object.entries(ESLINT_PRESETS).map(([key, preset]) => ({
            label: preset.name,
            value: key,
            hint: preset.description,
          })),
        });

        const selectedPreset = ESLINT_PRESETS[preset];
        if (!selectedPreset) {
          return;
        }

        const confirm = await confirmPrompt({
          title: `Replace current ESLint config with ${selectedPreset.name}?`,
          content:
            "This will overwrite your current ESLint configuration and update dependencies.",
          defaultValue: false,
        });

        if (confirm) {
          // Get current dependencies
          const currentDeps = await getCurrentDependencies(cwd);

          // Find dependencies to remove (ESLint-related packages that aren't in the new preset)
          const depsToRemove = Object.keys(currentDeps).filter(
            (dep) =>
              (dep.includes("eslint") ?? dep.includes("typescript-eslint")) &&
              !selectedPreset.dependencies.includes(dep),
          );

          if (depsToRemove.length > 0) {
            relinka("info", "Removing unnecessary dependencies...");
            await uninstallDependencies(cwd, depsToRemove);
          }

          relinka("info", "Installing required dependencies...");
          await installDependencies(cwd, selectedPreset.dependencies);

          relinka("info", "Writing ESLint configuration...");
          await fs.writeFile(
            path.join(cwd, "eslint.config.js"),
            typeof selectedPreset.config === "string"
              ? selectedPreset.config
              : JSON.stringify(selectedPreset.config, null, 2),
          );

          relinka(
            "success",
            `ESLint configured with ${selectedPreset.name} preset!`,
          );
        }
      } else {
        relinka(
          "info",
          "Edit current configuration - Implementation coming soon!",
        );
      }
      break;
    }
    case "TypeScript":
      const tsConfig = destr<TSConfig>(content);
      const strictMode = await confirmPrompt({
        title: "Enable strict mode?",
        defaultValue: tsConfig.compilerOptions?.strict ?? false,
      });

      const target = await selectPrompt({
        title: "Select TypeScript target:",
        options: [
          { label: "ES2023", value: "ES2023" },
          { label: "ES2022", value: "ES2022" },
          { label: "ES2021", value: "ES2021" },
          { label: "ES2020", value: "ES2020" },
          { label: "ES2019", value: "ES2019" },
        ],
        defaultValue: tsConfig.compilerOptions?.target ?? "ES2023",
      });

      tsConfig.compilerOptions = {
        ...tsConfig.compilerOptions,
        strict: strictMode,
        target,
      };

      await fs.writeFile(
        path.join(cwd, configFile),
        JSON.stringify(tsConfig, null, 2),
      );
      break;

    // Cases for other config types as needed
    default:
      relinka(
        "info",
        `Editing ${config.name} configuration - Implementation coming soon!`,
      );
  }
}
