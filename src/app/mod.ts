// 📚 Docs: https://docs.reliverse.org/reliverse/cli

import {
  confirmPrompt,
  selectPrompt,
  multiselectPrompt,
} from "@reliverse/prompts";
import { destr } from "destr";
import fs from "fs-extra";
import { globby } from "globby";
import { exec } from "node:child_process";
import path from "pathe";
import pc from "picocolors";

import type {
  IntegrationCategory,
  IntegrationOptions,
  ReliverseConfig,
} from "~/types.js";

import { readReliverseMemory } from "~/args/memory/impl.js";
import { convertCjsToEsm } from "~/utils/codemods/convertCjsToEsm.js";
import {
  convertPrismaToDrizzle,
  convertDatabaseProvider,
} from "~/utils/codemods/convertDatabase.js";
import { convertImportStyle } from "~/utils/codemods/convertImportStyle.js";
import { convertJsToTs } from "~/utils/codemods/convertJsToTs.js";
import { convertQuoteStyle } from "~/utils/codemods/convertQuoteStyle.js";
import { convertRuntime } from "~/utils/codemods/convertRuntime.js";
import { convertTailwindV3ToV4 } from "~/utils/codemods/convertTailwind.js";
import { convertToMonorepo } from "~/utils/codemods/convertToMonorepo.js";
import { convertTypeDefinitions } from "~/utils/codemods/convertTypeDefinitions.js";
import { replaceImportSymbol } from "~/utils/codemods/replaceImportSymbol.js";
import { replaceWithModern } from "~/utils/codemods/replaceWithModern.js";
import { relinka } from "~/utils/console.js";
import { getCurrentWorkingDirectory } from "~/utils/fs.js";
import {
  installIntegration,
  INTEGRATION_CONFIGS,
  REMOVAL_CONFIGS,
  removeIntegration,
} from "~/utils/integrations.js";
import {
  readReliverseConfig,
  writeReliverseConfig,
  getDefaultReliverseConfig,
  validateAndInsertMissingKeys,
  detectProjectType,
  generateDefaultRulesForProject,
  parseCodeStyleFromConfigs,
} from "~/utils/rules.js";
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

import {
  randomReliverseMenuTitle,
  randomWelcomeMessages,
} from "../utils/data/messages.js";
import { buildBrandNewThing } from "./menu/buildBrandNewThing.js";
import {
  manageDrizzleSchema,
  detectDatabaseProvider,
} from "./menu/manageDrizzleSchema.js";
import { showEndPrompt, showStartPrompt } from "./menu/showStartEndPrompt.js";

type TSConfig = {
  compilerOptions?: {
    strict?: boolean;
    noImplicitAny?: boolean;
    strictNullChecks?: boolean;
    module?: string;
    moduleResolution?: string;
    target?: string;
    jsx?: string;
    verbatimModuleSyntax?: boolean;
    esModuleInterop?: boolean;
  };
};

type ConfigFile = {
  name: string;
  files: string[];
  editPrompt: string;
};

type ConfigPreset = {
  name: string;
  description: string;
  dependencies: string[];
  config: string | Record<string, any>;
};

const ESLINT_PRESETS: Record<string, ConfigPreset> = {
  "typescript-strict": {
    name: "TypeScript Strict",
    description: "Strict TypeScript configuration with all recommended rules",
    dependencies: [
      "eslint",
      "@typescript-eslint/eslint-plugin",
      "@typescript-eslint/parser",
      "typescript",
    ],
    config: `// @ts-check
import eslint from "@eslint/js";
import tseslint from "typescript-eslint";

export default tseslint.config(
  eslint.configs.recommended,
  ...tseslint.configs.strictTypeChecked,
  ...tseslint.configs.stylisticTypeChecked,
  {
    files: ["**/*.{js,jsx,ts,tsx}"],
    rules: {
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/explicit-function-return-type": "error",
      "@typescript-eslint/strict-boolean-expressions": "error",
      "@typescript-eslint/no-unused-vars": "error",
      "@typescript-eslint/naming-convention": [
        "error",
        {
          "selector": "default",
          "format": ["camelCase"]
        },
        {
          "selector": "variable",
          "format": ["camelCase", "UPPER_CASE"]
        },
        {
          "selector": "typeLike",
          "format": ["PascalCase"]
        }
      ]
    }
  }
);`,
  },
  "typescript-recommended": {
    name: "TypeScript Recommended",
    description: "Balanced TypeScript configuration with recommended rules",
    dependencies: [
      "eslint",
      "@typescript-eslint/eslint-plugin",
      "@typescript-eslint/parser",
      "typescript",
    ],
    config: `// @ts-check
import eslint from "@eslint/js";
import tseslint from "typescript-eslint";

export default tseslint.config(
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ["**/*.{js,jsx,ts,tsx}"],
    rules: {
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/explicit-function-return-type": "warn",
      "@typescript-eslint/no-unused-vars": "warn"
    }
  }
);`,
  },
  "typescript-relaxed": {
    name: "TypeScript Relaxed",
    description: "Minimal TypeScript configuration with basic rules",
    dependencies: [
      "eslint",
      "@typescript-eslint/eslint-plugin",
      "@typescript-eslint/parser",
      "typescript",
    ],
    config: `// @ts-check
import eslint from "@eslint/js";
import tseslint from "typescript-eslint";

export default tseslint.config(
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ["**/*.{js,jsx,ts,tsx}"],
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/explicit-function-return-type": "off",
      "@typescript-eslint/no-unused-vars": "warn"
    }
  }
);`,
  },
};

const CONFIG_FILES: ConfigFile[] = [
  {
    name: "TypeScript",
    files: ["tsconfig.json"],
    editPrompt: "Edit TypeScript configuration",
  },
  {
    name: "Biome",
    files: ["biome.json", "biome.jsonc"],
    editPrompt: "Edit Biome configuration",
  },
  {
    name: "Knip",
    files: ["knip.json", "knip.jsonc"],
    editPrompt: "Edit Knip configuration",
  },
  {
    name: "ESLint",
    files: ["eslint.config.js"],
    editPrompt: "Edit ESLint configuration",
  },
  {
    name: "Vitest",
    files: ["vitest.config.ts"],
    editPrompt: "Edit Vitest configuration",
  },
  {
    name: "Prettier",
    files: [
      ".prettierrc",
      ".prettierrc.json",
      ".prettierrc.yml",
      ".prettierrc.yaml",
      ".prettierrc.json5",
      ".prettierrc.js",
      "prettier.config.js",
    ],
    editPrompt: "Edit Prettier configuration",
  },
];

async function handleCodemods(rules: ReliverseConfig, cwd: string) {
  const availableCodemods = [];

  // Push: Tailwind v3 to v4 conversion codemod
  if (rules.preferredLibraries.styling === "tailwind") {
    availableCodemods.push({
      label: "Convert Tailwind CSS v3 to v4",
      value: "tailwind-v4",
      hint: "Update to Tailwind CSS v4 with CSS-first configuration",
    });
  }

  // Push: import symbol codemod if rule exists
  if (rules.codeStyle.importSymbol?.length) {
    availableCodemods.push({
      label: "Replace Import Symbols",
      value: "import-symbols",
      hint: `${rules.codeStyle.importSymbol.length} symbol(s) to replace`,
    });
  }

  // Push: quote style codemod if it differs from current
  availableCodemods.push({
    label: "Convert Quote Style",
    value: "quote-style",
    hint: `Convert all quotes to ${rules.codeStyle.quoteMark}`,
  });

  // Push: import style codemod
  if (rules.codeStyle.importOrRequire !== "mixed") {
    availableCodemods.push({
      label: "Convert Import Style",
      value: "import-style",
      hint: `Convert to ${rules.codeStyle.importOrRequire} style`,
    });
  }

  // Push: type definitions codemod
  if (rules.codeStyle.typeOrInterface !== "mixed") {
    availableCodemods.push({
      label: "Convert Type Definitions",
      value: "type-definitions",
      hint: `Convert to ${rules.codeStyle.typeOrInterface} style`,
    });
  }

  // Push: CJS to ESM codemod if enabled
  if (rules.codeStyle.cjsToEsm) {
    availableCodemods.push({
      label: "Convert CommonJS to ESM",
      value: "cjs-to-esm",
      hint: "Convert require/exports to import/export",
    });
  }

  // Push: runtime conversion codemods
  if (rules.runtime === "nodejs") {
    availableCodemods.push(
      {
        label: "Convert to Bun",
        value: "nodejs-to-bun",
        hint: "Convert Node.js APIs to Bun APIs",
      },
      {
        label: "Convert to Deno",
        value: "nodejs-to-deno",
        hint: "Convert Node.js APIs to Deno APIs",
      },
    );
  }

  // Push: monorepo conversion codemod if configured
  if (rules.monorepo?.type) {
    availableCodemods.push({
      label: "Convert to Monorepo",
      value: "single-to-monorepo",
      hint: `Convert to ${rules.monorepo.type} monorepo`,
    });
  }

  // Push: modernize codemod if any modernize options are enabled
  if (
    rules.codeStyle.modernize &&
    Object.values(rules.codeStyle.modernize).some(Boolean)
  ) {
    availableCodemods.push({
      label: "Modernize Code",
      value: "modernize",
      hint: "Replace Node.js APIs with modern alternatives",
    });
  }

  // Push: JS to TS codemod if enabled
  if (rules.codeStyle.jsToTs) {
    availableCodemods.push({
      label: "Convert JavaScript to TypeScript",
      value: "js-to-ts",
      hint: "Add TypeScript types to JavaScript files",
    });
  }

  if (availableCodemods.length === 0) {
    relinka("info", "No codemods available in reliverse.json");
    return;
  }

  const selectedCodemods = await multiselectPrompt({
    title: "Select codemods to run",
    options: availableCodemods,
  });

  for (const codemod of selectedCodemods) {
    if (codemod === "tailwind-v4") {
      const shouldConvert = await confirmPrompt({
        title: "Convert Tailwind CSS v3 to v4?",
        content:
          "This will update your configuration to use the new CSS-first approach and make necessary class name changes.",
        defaultValue: true,
      });

      if (shouldConvert) {
        await convertTailwindV3ToV4(cwd);
      }
    } else if (codemod === "import-symbols") {
      const targetSymbol = rules.codeStyle.importSymbol;
      if (!targetSymbol) {
        continue;
      }

      const shouldReplace = await confirmPrompt({
        title: `Replace current import symbol with "${targetSymbol}"?`,
        content: "The current symbol will be automatically detected.",
        defaultValue: true,
      });

      if (shouldReplace) {
        await replaceImportSymbol(cwd, targetSymbol);
        relinka(
          "success",
          `Replaced detected import symbol with "${targetSymbol}"`,
        );
      }
    } else if (codemod === "quote-style") {
      const shouldConvert = await confirmPrompt({
        title: `Convert all quotes to ${rules.codeStyle.quoteMark}?`,
        defaultValue: true,
      });

      if (shouldConvert) {
        await convertQuoteStyle(cwd, rules.codeStyle.quoteMark);
      }
    } else if (codemod === "import-style") {
      const style = rules.codeStyle.importOrRequire;
      if (style !== "mixed") {
        const shouldConvert = await confirmPrompt({
          title: `Convert to ${style} style?`,
          defaultValue: true,
        });

        if (shouldConvert) {
          await convertImportStyle(cwd, style);
        }
      }
    } else if (codemod === "type-definitions") {
      const style = rules.codeStyle.typeOrInterface;
      if (style !== "mixed") {
        const shouldConvert = await confirmPrompt({
          title: `Convert type definitions to ${style} style?`,
          defaultValue: true,
        });

        if (shouldConvert) {
          await convertTypeDefinitions(cwd, style);
        }
      }
    } else if (codemod === "cjs-to-esm") {
      const shouldConvert = await confirmPrompt({
        title: "Convert CommonJS to ESM?",
        defaultValue: true,
      });

      if (shouldConvert) {
        await convertCjsToEsm(cwd);
      }
    } else if (codemod === "nodejs-to-bun") {
      const shouldConvert = await confirmPrompt({
        title: "Convert Node.js code to Bun?",
        defaultValue: true,
      });

      if (shouldConvert) {
        await convertRuntime(cwd, "bun");
      }
    } else if (codemod === "nodejs-to-deno") {
      const shouldConvert = await confirmPrompt({
        title: "Convert Node.js code to Deno?",
        defaultValue: true,
      });

      if (shouldConvert) {
        await convertRuntime(cwd, "deno");
      }
    } else if (codemod === "single-to-monorepo" && rules.monorepo) {
      const shouldConvert = await confirmPrompt({
        title: `Convert to ${rules.monorepo.type} monorepo?`,
        defaultValue: true,
      });

      if (shouldConvert) {
        await convertToMonorepo(
          cwd,
          rules.monorepo.type,
          rules.monorepo.packages,
          rules.monorepo.sharedPackages,
        );
      }
    } else if (codemod === "modernize") {
      const shouldModernize = await confirmPrompt({
        title: "Replace Node.js APIs with modern alternatives?",
        defaultValue: true,
      });

      if (shouldModernize) {
        await replaceWithModern(cwd);
      }
    } else if (codemod === "js-to-ts") {
      const shouldConvert = await confirmPrompt({
        title: "Convert JavaScript files to TypeScript?",
        defaultValue: true,
      });

      if (shouldConvert) {
        await convertJsToTs(cwd);
      }
    }
  }
}

async function handleIntegrations(cwd: string) {
  const integrationOptions: IntegrationOptions = {
    database: [
      {
        label: "Drizzle",
        value: "drizzle",
        subOptions: [
          {
            label: "PostgreSQL",
            value: "postgres",
            providers: ["neon", "railway"],
          },
          { label: "SQLite", value: "sqlite" },
          { label: "MySQL", value: "mysql" },
        ],
      },
      { label: "Prisma", value: "prisma" },
      { label: "Supabase", value: "supabase" },
      { label: "None (Remove existing)", value: "none" },
    ],
    payments: [
      { label: "Stripe", value: "stripe" },
      { label: "Polar", value: "polar" },
      { label: "None (Remove existing)", value: "none" },
    ],
    auth: [
      { label: "NextAuth.js", value: "next-auth" },
      { label: "Clerk", value: "clerk" },
      { label: "Better-Auth", value: "better-auth" },
      { label: "None (Remove existing)", value: "none" },
    ],
    email: [
      { label: "Resend", value: "resend" },
      { label: "None (Remove existing)", value: "none" },
    ],
    styling: [
      { label: "Tailwind CSS", value: "tailwind" },
      { label: "shadcn/ui", value: "shadcn" },
      { label: "None (Remove existing)", value: "none" },
    ],
    testing: [
      { label: "Bun Test", value: "bun-test" },
      { label: "Vitest", value: "vitest" },
      { label: "Jest", value: "jest" },
      { label: "None (Remove existing)", value: "none" },
    ],
    i18n: [
      { label: "next-intl", value: "next-intl" },
      { label: "next-international", value: "next-international" },
      { label: "Lingui", value: "lingui" },
      { label: "None (Remove existing)", value: "none" },
    ],
  };

  const category = await selectPrompt<IntegrationCategory>({
    title: "Which type of integration would you like to add?",
    options: [
      { label: "Database", value: "database" },
      { label: "Payments", value: "payments" },
      { label: "Authentication", value: "auth" },
      { label: "Email", value: "email" },
      { label: "Styling", value: "styling" },
      { label: "Testing", value: "testing" },
      { label: "Internationalization", value: "i18n" },
    ],
  });

  const options = integrationOptions[category];
  const selectedIntegration = await selectPrompt({
    title: `Select ${category} integration:`,
    options: options.map((opt) => ({
      label: opt.label,
      value: opt.value,
    })),
  });

  // Handle removal case
  if (selectedIntegration === "none") {
    const shouldRemove = await confirmPrompt({
      title: `Are you sure you want to remove all ${category} integrations?`,
      content: `This will remove all ${category}-related files and dependencies`,
      defaultValue: false,
    });
    if (shouldRemove && REMOVAL_CONFIGS[category]) {
      await removeIntegration(cwd, REMOVAL_CONFIGS[category]);
      return;
    }
  }

  // Handle database-specific sub-options
  if (category === "database" && selectedIntegration === "drizzle") {
    const option = options.find((opt) => opt.value === "drizzle");
    const dbType = await selectPrompt({
      title: "Select database type:",
      options: option.subOptions.map((sub) => ({
        label: sub.label,
        value: sub.value,
      })),
    });

    // Handle provider selection for PostgreSQL
    if (dbType === "postgres") {
      const provider = await selectPrompt({
        title: "Select database provider:",
        options: option.subOptions
          .find((sub) => sub.value === "postgres")
          .providers.map((p) => ({ label: p, value: p.toLowerCase() })),
      });

      const config = {
        ...INTEGRATION_CONFIGS.drizzle,
        dependencies: [
          ...INTEGRATION_CONFIGS.drizzle.dependencies,
          provider === "neon" ? "@neondatabase/serverless" : "postgres",
        ],
      };

      await installIntegration(cwd, config);
      return;
    }

    await installIntegration(cwd, INTEGRATION_CONFIGS.drizzle);
    return;
  }

  // Handle other integrations
  const integrationKey = selectedIntegration;
  if (INTEGRATION_CONFIGS[integrationKey]) {
    await installIntegration(cwd, INTEGRATION_CONFIGS[integrationKey]);
    return;
  }

  relinka(
    "info",
    `Selected ${selectedIntegration} for ${category} - Implementation coming soon!`,
  );
}

async function detectConfigFiles(cwd: string): Promise<ConfigFile[]> {
  const detectedConfigs: ConfigFile[] = [];

  for (const config of CONFIG_FILES) {
    for (const file of config.files) {
      if (await fs.pathExists(path.join(cwd, file))) {
        detectedConfigs.push(config);
        break;
      }
    }
  }

  return detectedConfigs;
}

async function installDependencies(
  cwd: string,
  dependencies: string[],
): Promise<void> {
  const packageManager = (await fs.pathExists(path.join(cwd, "yarn.lock")))
    ? "yarn"
    : (await fs.pathExists(path.join(cwd, "pnpm-lock.yaml")))
      ? "pnpm"
      : "npm";

  const installCmd =
    packageManager === "npm"
      ? `npm install -D ${dependencies.join(" ")}`
      : packageManager === "yarn"
        ? `yarn add -D ${dependencies.join(" ")}`
        : `pnpm add -D ${dependencies.join(" ")}`;

  await new Promise<void>((resolve, reject) => {
    exec(installCmd, { cwd }, (error: Error | null) => {
      if (error) {
        reject(error);
      } else {
        resolve();
      }
    });
  });
}

// Function to get current dependencies
async function getCurrentDependencies(
  cwd: string,
): Promise<Record<string, string>> {
  const packageJsonPath = path.join(cwd, "package.json");
  if (await fs.pathExists(packageJsonPath)) {
    const packageJson = destr<PackageJson>(
      await fs.readFile(packageJsonPath, "utf-8"),
    );
    return {
      ...(packageJson.dependencies || {}),
      ...(packageJson.devDependencies || {}),
    };
  }
  return {};
}

// Function to uninstall dependencies
async function uninstallDependencies(
  cwd: string,
  dependencies: string[],
): Promise<void> {
  if (dependencies.length === 0) {
    return;
  }

  const packageManager = (await fs.pathExists(path.join(cwd, "yarn.lock")))
    ? "yarn"
    : (await fs.pathExists(path.join(cwd, "pnpm-lock.yaml")))
      ? "pnpm"
      : "npm";

  const uninstallCmd =
    packageManager === "npm"
      ? `npm uninstall ${dependencies.join(" ")}`
      : packageManager === "yarn"
        ? `yarn remove ${dependencies.join(" ")}`
        : `pnpm remove ${dependencies.join(" ")}`;

  await new Promise<void>((resolve, reject) => {
    exec(uninstallCmd, { cwd }, (error: Error | null) => {
      if (error) {
        reject(error);
      } else {
        resolve();
      }
    });
  });
}

async function handleConfigEditing(cwd: string) {
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
              (dep.includes("eslint") || dep.includes("typescript-eslint")) &&
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
          { label: "ES2022", value: "ES2022" },
          { label: "ES2021", value: "ES2021" },
          { label: "ES2020", value: "ES2020" },
          { label: "ES2019", value: "ES2019" },
        ],
        defaultValue: tsConfig.compilerOptions?.target ?? "ES2022",
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

// Type for Knip config
type KnipConfig = {
  ignoreDependencies?: string[];
  entry?: string[];
  project?: string[];
};

// Cleanup functions
async function removeComments(cwd: string): Promise<void> {
  // Use Biome to remove comments if available, otherwise use regex
  const files = await globby("**/*.{js,jsx,ts,tsx}", { cwd });
  for (const file of files) {
    const content = await fs.readFile(path.join(cwd, file), "utf-8");
    const withoutComments = content
      .replace(/\/\*[\s\S]*?\*\//g, "") // Remove multi-line comments
      .replace(/\/\/.*/g, "") // Remove single-line comments
      .replace(/^\s*[\r\n]/gm, ""); // Remove empty lines
    await fs.writeFile(path.join(cwd, file), withoutComments);
  }
  relinka("success", "Removed comments from all TypeScript/JavaScript files");
}

// Type definition at the top with other types
type PackageJson = {
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
};

// Update the getUnusedDependencies function
async function getUnusedDependencies(
  cwd: string,
  ignoredDeps: string[] = [],
): Promise<string[]> {
  const packageJsonPath = path.join(cwd, "package.json");
  const packageJson = destr<PackageJson>(
    await fs.readFile(packageJsonPath, "utf-8"),
  );
  const allDeps = {
    ...(packageJson.dependencies || {}),
    ...(packageJson.devDependencies || {}),
  };

  // Get all JS/TS files
  const files = await globby("**/*.{js,jsx,ts,tsx}", { cwd });
  const imports = new Set<string>();

  // Collect all imports
  for (const file of files) {
    const content = await fs.readFile(path.join(cwd, file), "utf-8");
    const importMatches = content.matchAll(/from ['"]([^'"]+)['"]/g);
    for (const match of importMatches) {
      const [, pkg] = match;
      if (!pkg.startsWith(".") && !pkg.startsWith("~/")) {
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

async function handleCleanup(cwd: string) {
  // Try to read Knip config for ignoreDependencies
  let ignoredDeps: string[] = [];
  try {
    const knipConfigPath = path.join(cwd, "knip.json");
    if (await fs.pathExists(knipConfigPath)) {
      const knipConfig = destr<KnipConfig>(
        await fs.readFile(knipConfigPath, "utf-8"),
      );
      ignoredDeps = knipConfig.ignoreDependencies || [];
    }
  } catch (error) {
    relinka(
      "warn-verbose",
      "Error reading Knip config:",
      error instanceof Error ? error.message : String(error),
    );
  }

  // Read ignoreDependencies from reliverse.json if exists
  try {
    const rules = await readReliverseConfig(cwd);
    if (rules?.ignoreDependencies) {
      ignoredDeps = [...new Set([...ignoredDeps, ...rules.ignoreDependencies])];
    }
  } catch (error) {
    relinka(
      "warn-verbose",
      "Error reading reliverse.json:",
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

// Update getMainMenuOptions to include cleanup option
async function getMainMenuOptions(
  cwd: string,
): Promise<{ label: string; value: string }[]> {
  const options = [
    {
      label: pc.bold("✨ Build a brand new thing"),
      value: "create",
    },
    {
      label: "- Cleanup project",
      value: "cleanup",
      hint: "Remove comments, unused dependencies",
    },
    {
      label: "👈 Exit",
      value: "exit",
      hint: pc.dim("ctrl+c anywhere"),
    },
  ];

  // Check for config files
  const detectedConfigs = await detectConfigFiles(cwd);
  if (detectedConfigs.length > 0) {
    options.splice(1, 0, {
      label: "- Edit project config files",
      value: "edit-config",
      hint: `${detectedConfigs.length} config(s) detected`,
    });
  }

  try {
    let rules: ReliverseConfig | null = null;
    // First check if file exists and has content
    const rulesPath = path.join(cwd, "reliverse.json");
    const rulesFileExists = await fs.pathExists(rulesPath);
    if (!rulesFileExists) {
      return options;
    }

    // Read file content first
    const fileContent = await fs.readFile(rulesPath, "utf-8");
    const parsedContent = fileContent.trim()
      ? destr<Partial<ReliverseConfig>>(fileContent)
      : {};

    // Get default rules based on project type
    const projectType = await detectProjectType(cwd);
    const defaultRules = projectType
      ? await generateDefaultRulesForProject(cwd)
      : await getDefaultReliverseConfig(
          path.basename(cwd),
          "user",
          "nextjs", // fallback default
        );

    if (defaultRules) {
      // Parse code style from existing config files
      const configRules = await parseCodeStyleFromConfigs(cwd);

      // Always merge with defaults to ensure all fields exist
      const mergedRules = {
        projectName: defaultRules.projectName,
        projectAuthor: defaultRules.projectAuthor,
        projectFramework: defaultRules.projectFramework,
        packageManager: defaultRules.projectPackageManager,
        ...parsedContent,
        features: {
          ...defaultRules.features,
          ...(parsedContent.features || {}),
        },
        preferredLibraries: {
          ...defaultRules.preferredLibraries,
          ...(parsedContent.preferredLibraries || {}),
        },
        codeStyle: {
          ...defaultRules.codeStyle,
          ...(configRules?.codeStyle || {}),
          ...(parsedContent.codeStyle || {}),
        },
      };

      // Only write if there were missing fields or different values
      if (JSON.stringify(mergedRules) !== JSON.stringify(parsedContent)) {
        const hasNewFields = !Object.keys(parsedContent).every(
          (key) =>
            JSON.stringify(mergedRules[key]) ===
            JSON.stringify(parsedContent[key]),
        );

        if (hasNewFields) {
          await writeReliverseConfig(cwd, mergedRules);
          relinka(
            "info",
            "Updated reliverse.json with missing configurations. Please review and adjust as needed.",
          );
        }
      }
      rules = mergedRules;

      // Integration and config options if rules exist
      options.splice(
        1,
        0,
        { label: "- Add integration", value: "add" },
        { label: "- Configure project", value: "config" },
      );

      // Drizzle option if configured
      if (rules.preferredLibraries?.database === "drizzle") {
        const provider = await detectDatabaseProvider(cwd);
        const isDrizzleConfigured = provider !== null;
        const isSupportedProvider =
          provider === "postgres" ||
          provider === "sqlite" ||
          provider === "mysql";

        if (isDrizzleConfigured && isSupportedProvider) {
          options.splice(options.length - 1, 0, {
            label: "- Manage Drizzle schema",
            value: "drizzle-schema",
          });
        }
      }
    }
  } catch (error) {
    // Only show warning for non-initialization errors
    if (error instanceof Error && !error.message.includes("JSON Parse error")) {
      relinka(
        "warn",
        "Error processing reliverse.json file. Using basic menu options.",
      );
      relinka(
        "warn-verbose",
        error instanceof Error ? error.message : String(error),
      );
    }
  }

  return options;
}

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
      title: "What type of conversion would you like to perform?",
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
