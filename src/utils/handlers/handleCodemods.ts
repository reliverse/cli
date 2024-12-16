import { confirmPrompt, multiselectPrompt } from "@reliverse/prompts";

import type { ReliverseConfig } from "~/types.js";

import { relinka } from "../console.js";
import { convertCjsToEsm } from "./codemods/convertCjsToEsm.js";
import { convertTypeDefinitions } from "./codemods/convertDefinitions.js";
import { convertImportStyle } from "./codemods/convertImportStyle.js";
import { convertJsToTs } from "./codemods/convertJsToTs.js";
import { convertQuoteStyle } from "./codemods/convertQuoteStyle.js";
import { convertRuntime } from "./codemods/convertRuntime.js";
import { convertTailwindV3ToV4 } from "./codemods/convertTailwind.js";
import { convertToMonorepo } from "./codemods/convertToMonorepo.js";
import { replaceImportSymbol } from "./codemods/replaceImportSymbol.js";
import { replaceWithModern } from "./codemods/replaceWithModern.js";

export async function handleCodemods(rules: ReliverseConfig, cwd: string) {
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

  // Push: Definitions converter codemod
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
          title: `Convert TS definitions to ${style} style?`,
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
