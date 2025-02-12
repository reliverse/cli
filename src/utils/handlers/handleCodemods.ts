import { confirmPrompt, multiselectPrompt } from "@reliverse/prompts";
import { relinka } from "@reliverse/prompts";

import type { MonorepoType } from "~/types.js";
import type { ReliverseConfig } from "~/utils/schemaConfig.js";

import { cliConfigJsonc } from "~/app/constants.js";
import { convertCjsToEsm } from "~/utils/codemods/convertCjsToEsm.js";
import { convertTypeDefinitions } from "~/utils/codemods/convertDefinitions.js";
import { convertImportStyle } from "~/utils/codemods/convertImportStyle.js";
import { convertJsToTs } from "~/utils/codemods/convertJsToTs.js";
import { convertQuoteStyle } from "~/utils/codemods/convertQuoteStyle.js";
import { convertRuntime } from "~/utils/codemods/convertRuntime.js";
import { convertToMonorepo } from "~/utils/codemods/convertToMonorepo.js";
import { replaceImportSymbol } from "~/utils/codemods/replaceImportSymbol.js";
import { replaceWithModern } from "~/utils/codemods/replaceWithModern.js";

export async function handleCodemods(rules: ReliverseConfig, cwd: string) {
  if (!rules.codeStyle || !rules.preferredLibraries) {
    relinka("error", `Missing required configuration in ${cliConfigJsonc}`);
    return;
  }

  const availableCodemods = [];

  // Push: import symbol codemod if rule exists
  if (rules.codeStyle?.importSymbol?.length) {
    // @ts-expect-error TODO: fix strictNullChecks undefined
    availableCodemods.push({
      label: "Replace Import Symbols",
      value: "import-symbols",
      hint: `${rules.codeStyle.importSymbol.length} symbol(s) to replace`,
    });
  }

  // Push: quote style codemod if it differs from current
  // @ts-expect-error TODO: fix strictNullChecks undefined
  availableCodemods.push({
    label: "Convert Quote Style",
    value: "quote-style",
    hint: `Convert all quotes to ${rules.codeStyle.quoteMark}`,
  });

  // Push: import style codemod
  const importStyle = rules.codeStyle?.importOrRequire;
  if (importStyle && importStyle !== "mixed") {
    // @ts-expect-error TODO: fix strictNullChecks undefined
    availableCodemods.push({
      label: "Convert Import Style",
      value: "import-style",
      hint: `Convert all imports to ${importStyle} style`,
    });
  }

  // Push: Definitions converter codemod
  const typeStyle = rules.codeStyle?.typeOrInterface;
  if (typeStyle && typeStyle !== "mixed") {
    // @ts-expect-error TODO: fix strictNullChecks undefined
    availableCodemods.push({
      label: "Convert Type Definitions",
      value: "type-definitions",
      hint: `Convert all declarations to ${typeStyle}s`,
    });
  }

  // Push: CJS to ESM codemod if enabled
  if (rules.codeStyle?.cjsToEsm) {
    // @ts-expect-error TODO: fix strictNullChecks undefined
    availableCodemods.push({
      label: "Convert CommonJS to ESM",
      value: "cjs-to-esm",
      hint: "Convert require/exports to import/export",
    });
  }

  // Push: runtime conversion codemods
  if (rules.projectRuntime === "node") {
    availableCodemods.push(
      // @ts-expect-error TODO: fix strictNullChecks undefined
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
    // @ts-expect-error TODO: fix strictNullChecks undefined
    availableCodemods.push({
      label: "Convert to Monorepo",
      value: "single-to-monorepo",
      hint: `Convert to ${rules.monorepo.type} monorepo`,
    });
  }

  // Push: modernize codemod if any modernize options are enabled
  if (
    rules.codeStyle?.modernize &&
    Object.values(rules.codeStyle.modernize).some(Boolean)
  ) {
    // @ts-expect-error TODO: fix strictNullChecks undefined
    availableCodemods.push({
      label: "Modernize Code",
      value: "modernize",
      hint: "Replace Node.js APIs with modern alternatives",
    });
  }

  // Push: JS to TS codemod if enabled
  if (rules.codeStyle?.jsToTs) {
    // @ts-expect-error TODO: fix strictNullChecks undefined
    availableCodemods.push({
      label: "Convert JavaScript to TypeScript",
      value: "js-to-ts",
      hint: "Add TypeScript types to JavaScript files",
    });
  }

  if (availableCodemods.length === 0) {
    relinka("info", `No codemods available in ${cliConfigJsonc}`);
    return;
  }

  const selectedCodemods = await multiselectPrompt({
    title: "Select codemods to run",
    options: availableCodemods,
  });

  for (const codemod of selectedCodemods) {
    if (codemod === "import-symbols") {
      const targetSymbol = rules.codeStyle?.importSymbol;
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
    } else if (codemod === "quote-style" && rules.codeStyle?.quoteMark) {
      const shouldConvert = await confirmPrompt({
        title: `Convert all quotes to ${rules.codeStyle.quoteMark}?`,
        defaultValue: true,
      });

      if (shouldConvert) {
        await convertQuoteStyle(cwd, rules.codeStyle.quoteMark);
      }
    } else if (codemod === "import-style") {
      const style = rules.codeStyle?.importOrRequire;
      if (style && style !== "mixed") {
        const shouldConvert = await confirmPrompt({
          title: `Convert to ${style} style?`,
          defaultValue: true,
        });

        if (shouldConvert) {
          await convertImportStyle(cwd, style);
        }
      }
    } else if (codemod === "type-definitions") {
      const style = rules.codeStyle?.typeOrInterface;
      if (style && style !== "mixed") {
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
    } else if (codemod === "single-to-monorepo" && rules.monorepo?.type) {
      const monorepoType = rules.monorepo.type;
      if (isValidMonorepoType(monorepoType)) {
        const shouldConvert = await confirmPrompt({
          title: `Convert to ${monorepoType} monorepo?`,
          defaultValue: true,
        });

        if (shouldConvert) {
          await convertToMonorepo(
            cwd,
            monorepoType,
            rules.monorepo.packages,
            rules.monorepo.sharedPackages,
          );
        }
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

function isValidMonorepoType(type: string): type is MonorepoType {
  return [
    "turborepo",
    "moonrepo",
    "bun-workspaces",
    "pnpm-workspaces",
  ].includes(type);
}
