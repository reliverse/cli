// 📚 Docs: https://docs.reliverse.org/reliverse/cli

import {
  confirmPrompt,
  selectPrompt,
  multiselectPrompt,
} from "@reliverse/prompts";
import fs from "fs-extra";
import path from "pathe";
import pc from "picocolors";

import type { ReliverseConfig } from "~/types/config.js";
import type {
  IntegrationCategory,
  IntegrationOptions,
} from "~/types/integrations.js";
import type { ReliverseRules } from "~/types/rules.js";

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
import { convertToMonorepo } from "~/utils/codemods/convertToMonorepo.js";
import { convertTypeDefinitions } from "~/utils/codemods/convertTypeDefinitions.js";
import { replaceImportSymbol } from "~/utils/codemods/replaceImportSymbol.js";
import { replaceWithModern } from "~/utils/codemods/replaceWithModern.js";
import { relinka } from "~/utils/console.js";
import { getCurrentWorkingDirectory } from "~/utils/fs.js";
import {
  installDrizzle,
  installPrisma,
  installStripe,
  installNextAuth,
  installResend,
  installTailwind,
  installBunTest,
  installVitest,
  installJest,
} from "~/utils/integrations.js";
import { readReliverseRules } from "~/utils/rules.js";

import {
  randomReliverseMenuTitle,
  randomWelcomeMessages,
} from "./data/messages.js";
import { buildBrandNewThing } from "./menu/buildBrandNewThing.js";
import { showEndPrompt, showStartPrompt } from "./menu/showStartEndPrompt.js";

async function handleCodemods(rules: ReliverseRules, cwd: string) {
  const availableCodemods = [];

  // Add import symbol codemod if rule exists
  if (rules.codeStyle.importSymbol?.length) {
    availableCodemods.push({
      label: "Replace Import Symbols",
      value: "import-symbols",
      hint: `${rules.codeStyle.importSymbol.length} symbol(s) to replace`,
    });
  }

  // Add quote style codemod if it differs from current
  availableCodemods.push({
    label: "Convert Quote Style",
    value: "quote-style",
    hint: `Convert all quotes to ${rules.codeStyle.quoteMark}`,
  });

  // Add import style codemod
  if (rules.codeStyle.importOrRequire !== "mixed") {
    availableCodemods.push({
      label: "Convert Import Style",
      value: "import-style",
      hint: `Convert to ${rules.codeStyle.importOrRequire} style`,
    });
  }

  // Add type definitions codemod
  if (rules.codeStyle.typeOrInterface !== "mixed") {
    availableCodemods.push({
      label: "Convert Type Definitions",
      value: "type-definitions",
      hint: `Convert to ${rules.codeStyle.typeOrInterface} style`,
    });
  }

  // Add CJS to ESM codemod if enabled
  if (rules.codeStyle.cjsToEsm) {
    availableCodemods.push({
      label: "Convert CommonJS to ESM",
      value: "cjs-to-esm",
      hint: "Convert require/exports to import/export",
    });
  }

  // Add runtime conversion codemods
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

  // Add monorepo conversion codemod if configured
  if (rules.monorepo?.type) {
    availableCodemods.push({
      label: "Convert to Monorepo",
      value: "single-to-monorepo",
      hint: `Convert to ${rules.monorepo.type} monorepo`,
    });
  }

  // Add modernize codemod if any modernize options are enabled
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

  // Add JS to TS codemod if enabled
  if (rules.codeStyle.jsToTs) {
    availableCodemods.push({
      label: "Convert JavaScript to TypeScript",
      value: "js-to-ts",
      hint: "Add TypeScript types to JavaScript files",
    });
  }

  if (availableCodemods.length === 0) {
    relinka("info", "No codemods available in .reliverserules");
    return;
  }

  const selectedCodemods = await multiselectPrompt({
    title: "Select codemods to run",
    options: availableCodemods,
  });

  for (const codemod of selectedCodemods) {
    if (codemod === "import-symbols") {
      const symbols = rules.codeStyle.importSymbol;
      if (!symbols) {
        continue;
      }

      for (const symbol of symbols) {
        const shouldReplace = await confirmPrompt({
          title: `Replace "${symbol.from}" with "${symbol.to}"?${symbol.description ? `\n${symbol.description}` : ""}`,
          defaultValue: true,
        });

        if (shouldReplace) {
          await replaceImportSymbol(cwd, symbol.from, symbol.to);
          relinka(
            "success",
            `Replaced import symbol "${symbol.from}" with "${symbol.to}"`,
          );
        }
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
    ],
    payments: [
      { label: "Stripe", value: "stripe" },
      { label: "Polar", value: "polar" },
    ],
    auth: [
      { label: "NextAuth.js", value: "next-auth" },
      { label: "Clerk", value: "clerk" },
      { label: "Better-Auth", value: "better-auth" },
    ],
    email: [{ label: "Resend", value: "resend" }],
    styling: [
      { label: "Tailwind CSS", value: "tailwind" },
      { label: "shadcn/ui", value: "shadcn" },
    ],
    testing: [
      { label: "Bun Test", value: "bun-test" },
      { label: "Vitest", value: "vitest" },
      { label: "Jest", value: "jest" },
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

  // Handle database-specific sub-options
  if (category === "database") {
    if (selectedIntegration === "drizzle") {
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
        await installDrizzle(cwd, dbType, provider);
        return;
      }

      await installDrizzle(cwd, dbType);
      return;
    } else if (selectedIntegration === "prisma") {
      await installPrisma(cwd);
      return;
    }
  } else if (category === "payments") {
    if (selectedIntegration === "stripe") {
      await installStripe(cwd);
      return;
    }
  } else if (category === "auth") {
    if (selectedIntegration === "next-auth") {
      await installNextAuth(cwd);
      return;
    }
  } else if (category === "email") {
    if (selectedIntegration === "resend") {
      await installResend(cwd);
      return;
    }
  } else if (category === "styling") {
    if (selectedIntegration === "tailwind") {
      await installTailwind(cwd);
      return;
    }
  } else if (category === "testing") {
    if (selectedIntegration === "bun-test") {
      await installBunTest(cwd);
      return;
    } else if (selectedIntegration === "vitest") {
      await installVitest(cwd);
      return;
    } else if (selectedIntegration === "jest") {
      await installJest(cwd);
      return;
    }
  }

  relinka(
    "info",
    `Selected ${selectedIntegration} for ${category} - Implementation coming soon!`,
  );
}

export async function app({
  isDev,
  config,
}: { isDev: boolean; config: ReliverseConfig }) {
  await showStartPrompt();

  const cwd = getCurrentWorkingDirectory();

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

  // Check for .reliverserules in current directory
  const rules = await readReliverseRules(cwd);

  let options = [
    {
      label: pc.bold("✨ Build a brand new thing from scratch"),
      value: "1",
    },
    {
      label: `🔐 ${pc.italic("Exit")}`,
      value: "exit",
      hint: pc.dim("ctrl+c anywhere"),
    },
  ];

  // Add codemods option if .reliverserules exists
  if (rules) {
    options = [
      ...options,
      {
        label: "🛠️ Run Reliverse Codemods",
        value: "codemods",
        hint: "Apply codemods based on .reliverserules",
      },
      {
        label: "➕ Add Integration",
        value: "integration",
        hint: "Add new integration to your project",
      },
      {
        label: "🔄 Convert Database",
        value: "convert-db",
        hint: "Convert between database libraries or providers",
      },
    ];
  }

  const memory = await readReliverseMemory();
  const username = memory.user?.name || config.defaultUsername;

  const choice = await selectPrompt({
    title: `🤖 ${
      username
        ? randomWelcomeMessages(username)[
            Math.floor(Math.random() * randomWelcomeMessages(username).length)
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

  if (choice === "1") {
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

      // Add libSQL as an option when converting from PostgreSQL
      if (fromProvider === "postgres") {
        toProviderOptions.push({ label: "LibSQL/Turso", value: "libsql" });
      }

      const toProvider = await selectPrompt({
        title: "Convert to:",
        options: toProviderOptions.filter((opt) => opt.value !== fromProvider),
      });

      await convertDatabaseProvider(cwd, fromProvider, toProvider);
    }
  } else if (choice === "exit") {
    relinka("info", "👋 Goodbye!");
  }

  await showEndPrompt();
  process.exit(0);
}
