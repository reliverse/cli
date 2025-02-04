import { relinka } from "@reliverse/prompts";
import fs from "fs-extra";
import { globby } from "globby";
import path from "pathe";

import type { TailwindThemeVariable } from "~/types.js";

import {
  DEFAULT_THEME_VARIABLES,
  TAILWIND_REPLACEMENTS,
} from "./constants/convertTailwind.js";

async function updateTailwindConfig(cwd: string) {
  const configFiles = [
    "tailwind.config.js",
    "tailwind.config.ts",
    "tailwind.config.mjs",
    "tailwind.config.cjs",
  ];

  let configFound = false;

  for (const configFile of configFiles) {
    const configPath = path.join(cwd, configFile);
    if (await fs.pathExists(configPath)) {
      configFound = true;
      // Create a backup
      await fs.copy(configPath, `${configPath}.backup`);
      relinka("info", `Created backup of ${configFile}`);

      // Read the config file
      const content = await fs.readFile(configPath, "utf-8");

      // Extract theme configuration
      const themeMatch = /theme:\s*{([^}]*)}/s.exec(content);
      const themeContent = themeMatch ? themeMatch[1] : "";

      // Convert theme to CSS variables
      const cssVariables = convertThemeToCssVariables(themeContent);

      // Create CSS-first configuration
      const cssConfig = generateCssConfig(cssVariables);

      // Write the new CSS config
      const cssPath = path.join(cwd, "tailwind.css");
      await fs.writeFile(cssPath, cssConfig);
      relinka("success", "Created CSS-first configuration in tailwind.css");

      // Update Vite config if it exists
      await updateViteConfig(cwd);

      // Update PostCSS config
      await updatePostCssConfig(cwd);

      // Update package.json
      await updatePackageJson(cwd);
    }
  }

  if (!configFound) {
    relinka("warn", "No Tailwind configuration file found");
    // Create a new CSS config with default theme
    const cssConfig = generateCssConfig(DEFAULT_THEME_VARIABLES);
    await fs.writeFile(path.join(cwd, "tailwind.css"), cssConfig);
    relinka(
      "success",
      "Created default CSS-first configuration in tailwind.css",
    );
  }
}

function convertThemeToCssVariables(
  themeContent: string | undefined = "",
): TailwindThemeVariable[] {
  const variables: TailwindThemeVariable[] = [...DEFAULT_THEME_VARIABLES];

  // Extract color definitions
  const colorMatch = themeContent
    ? /colors:\s*{([^}]*)}/s.exec(themeContent)
    : null;
  if (colorMatch?.[1]) {
    const colorContent = colorMatch[1];
    const colorEntries = colorContent.matchAll(/(\w+):\s*['"]([^'"]+)['"]/g);
    for (const [, name, value] of Array.from(colorEntries)) {
      variables.push({
        name: `--color-${name}`,
        // @ts-expect-error TODO: fix strictNullChecks undefined
        value: value.startsWith("#") ? convertHexToOklch(value) : value,
      });
    }
  }

  // Extract spacing definitions
  const spacingMatch = themeContent
    ? /spacing:\s*{([^}]*)}/s.exec(themeContent)
    : null;
  if (spacingMatch) {
    variables.push({ name: "--spacing", value: "0.25rem" });
  }

  // Extract breakpoint definitions
  const screenMatch = themeContent
    ? /screens:\s*{([^}]*)}/s.exec(themeContent)
    : null;
  if (screenMatch?.[1]) {
    const screenContent = screenMatch[1];
    const screenEntries = screenContent.matchAll(/(\w+):\s*['"]([^'"]+)['"]/g);
    for (const [, name, value] of Array.from(screenEntries)) {
      // @ts-expect-error TODO: fix strictNullChecks undefined
      variables.push({ name: `--breakpoint-${name}`, value });
    }
  }

  return variables;
}

function convertHexToOklch(hex: string): string {
  // This is a placeholder - in a real implementation, you would convert hex to OKLCH
  // For now, we'll just return the hex value
  return hex;
}

function generateCssConfig(variables: TailwindThemeVariable[]): string {
  return `@import "tailwindcss";

@theme {
${variables.map(({ name, value }) => `  ${name}: ${value};`).join("\n")}
}

@layer theme, base, components, utilities;

@variant hover (@media (hover: hover));
@variant dark (&:where(.dark, .dark *));
`;
}

async function updateViteConfig(cwd: string) {
  const viteConfigFiles = [
    "vite.config.js",
    "vite.config.ts",
    "vite.config.mjs",
  ];

  for (const configFile of viteConfigFiles) {
    const configPath = path.join(cwd, configFile);
    if (await fs.pathExists(configPath)) {
      let content = await fs.readFile(configPath, "utf-8");

      // Update Tailwind plugin import and configuration
      content = content
        .replace(
          /import tailwindcss from ['"]tailwindcss['"]/g,
          'import tailwindcss from "@tailwindcss/vite"',
        )
        .replace(
          /plugins:\s*\[\s*tailwindcss\([^)]*\)/g,
          "plugins: [tailwindcss()",
        );

      await fs.writeFile(configPath, content);
      relinka("success", "Updated Vite configuration");
    }
  }
}

async function updatePostCssConfig(cwd: string) {
  const postCssFiles = ["postcss.config.js", "postcss.config.cjs"];

  for (const configFile of postCssFiles) {
    const configPath = path.join(cwd, configFile);
    if (await fs.pathExists(configPath)) {
      let content = await fs.readFile(configPath, "utf-8");

      // Remove old plugins and add new ones
      content = content
        .replace(/'postcss-import'[^,}]*,?\s*/g, "")
        .replace(/'tailwindcss'[^,}]*,?\s*/g, "")
        .replace(/'autoprefixer'[^,}]*,?\s*/g, "")
        .replace(
          /plugins:\s*{([^}]*)}/,
          "plugins: {\n    '@tailwindcss/postcss': {},\n  }",
        );

      await fs.writeFile(configPath, content);
      relinka("success", "Updated PostCSS configuration");
    }
  }
}

async function updatePackageJson(cwd: string) {
  const pkgPath = path.join(cwd, "package.json");
  if (await fs.pathExists(pkgPath)) {
    const pkg = await fs.readJson(pkgPath);
    const deps = pkg.dependencies ?? {};
    const devDeps = pkg.devDependencies ?? {};

    // Remove old dependencies
    delete deps.tailwindcss;
    delete deps["postcss-import"];
    delete deps.autoprefixer;
    delete devDeps.tailwindcss;
    delete devDeps["postcss-import"];
    delete devDeps.autoprefixer;

    // Inject new dependencies
    devDeps.tailwindcss = "next";
    devDeps["@tailwindcss/postcss"] = "next";

    // Inject Vite plugin if using Vite
    if (await fs.pathExists(path.join(cwd, "vite.config.ts"))) {
      devDeps["@tailwindcss/vite"] = "next";
    }

    pkg.dependencies = deps;
    pkg.devDependencies = devDeps;

    await fs.writeJson(pkgPath, pkg, { spaces: 2 });
    relinka("success", "Updated package.json dependencies");
  }
}

export async function convertTailwindV3ToV4(cwd: string) {
  try {
    relinka("info", "Starting Tailwind CSS v3 to v4 conversion...");

    // Update Tailwind configuration first
    await updateTailwindConfig(cwd);

    // Find all files that might contain Tailwind classes
    const files = await globby(
      ["**/*.{js,jsx,ts,tsx,vue,svelte,astro,html,css}"],
      {
        cwd,
        ignore: [
          "**/node_modules/**",
          "**/dist/**",
          "**/build/**",
          "**/.next/**",
          "**/.git/**",
          "**/coverage/**",
        ],
      },
    );

    let totalChanges = 0;
    let filesChanged = 0;

    // Process each file
    for (const file of files) {
      const filePath = path.join(cwd, file);
      let content = await fs.readFile(filePath, "utf-8");
      let hasChanges = false;
      let fileChanges = 0;

      type ReplaceCallback = (match: string, ...args: any[]) => string;

      for (const {
        pattern,
        replacement,
        description,
      } of TAILWIND_REPLACEMENTS) {
        const originalContent = content;
        content = content.replace(pattern, (...args) =>
          typeof replacement === "string"
            ? replacement
            : (replacement as ReplaceCallback)(
                args[0],
                ...(args.slice(1) as [string, ...any[]]),
              ),
        );
        if (content !== originalContent) {
          hasChanges = true;
          fileChanges++;
          relinka("info", `${description} in ${file}`);
        }
      }

      if (hasChanges) {
        await fs.writeFile(filePath, content);
        filesChanged++;
        totalChanges += fileChanges;
        relinka("success", `Updated ${file} (${fileChanges} changes)`);
      }
    }

    relinka(
      "success",
      `Completed Tailwind CSS v3 to v4 conversion
Files processed: ${files.length}
Files changed: ${filesChanged}
Total changes: ${totalChanges}`,
    );

    relinka(
      "info",
      "Next steps:\n" +
        "1. Review the changes in your version control system\n" +
        "2. Test your application thoroughly\n" +
        "3. Run your build process to ensure everything compiles\n" +
        "4. Check for any remaining Tailwind v3 patterns that might need manual updates",
    );
  } catch (error) {
    relinka(
      "error",
      `Failed to convert Tailwind CSS: ${
        error instanceof Error ? error.message : JSON.stringify(error)
      }`,
    );
    throw error;
  }
}
