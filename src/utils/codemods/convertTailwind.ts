import fs from "fs-extra";
import { globby } from "globby";
import path from "pathe";

import { relinka } from "~/utils/console.js";

type TailwindReplacement = {
  pattern: RegExp;
  replacement: string | ((match: string, ...args: string[]) => string);
  description: string;
};

type TailwindThemeVariable = {
  name: string;
  value: string;
};

const TAILWIND_REPLACEMENTS: TailwindReplacement[] = [
  // Configuration file changes
  {
    pattern: /@tailwind (base|components|utilities);/g,
    replacement: '@import "tailwindcss";',
    description: "Replace @tailwind directives with @import",
  },
  // Shadow scale changes
  {
    pattern: /shadow-sm/g,
    replacement: "shadow-xs",
    description: "Update shadow-sm to shadow-xs",
  },
  {
    pattern: /\bshadow\b(?!-)/g,
    replacement: "shadow-sm",
    description: "Update shadow to shadow-sm",
  },
  {
    pattern: /drop-shadow-sm/g,
    replacement: "drop-shadow-xs",
    description: "Update drop-shadow-sm to drop-shadow-xs",
  },
  {
    pattern: /\bdrop-shadow\b(?!-)/g,
    replacement: "drop-shadow-sm",
    description: "Update drop-shadow to drop-shadow-sm",
  },
  // Blur scale changes
  {
    pattern: /blur-sm/g,
    replacement: "blur-xs",
    description: "Update blur-sm to blur-xs",
  },
  {
    pattern: /\bblur\b(?!-)/g,
    replacement: "blur-sm",
    description: "Update blur to blur-sm",
  },
  // Border radius changes
  {
    pattern: /rounded-sm/g,
    replacement: "rounded-xs",
    description: "Update rounded-sm to rounded-xs",
  },
  {
    pattern: /\brounded\b(?!-)/g,
    replacement: "rounded-sm",
    description: "Update rounded to rounded-sm",
  },
  // Outline changes
  {
    pattern: /outline-none/g,
    replacement: "outline-hidden",
    description: "Replace outline-none with outline-hidden",
  },
  // CSS variable syntax in arbitrary values
  {
    pattern: /\[(--[\w-]+)\]/g,
    replacement: "($1)",
    description: "Update CSS variable syntax in arbitrary values",
  },
  // Hover variant update
  {
    pattern: /hover:/g,
    replacement: "hover:",
    description:
      "Keep hover: variant (now only applies when hover is supported)",
  },
  // Stacked variants order change (left-to-right)
  {
    pattern: /(first|last):\*:/g,
    replacement: "*:$1:",
    description: "Update stacked variants order to left-to-right",
  },
  // Ring width change
  {
    pattern: /\bring\b(?!-)/g,
    replacement: "ring-3",
    description: "Update default ring width from 3px to 1px",
  },
  // Theme function updates
  {
    pattern: /theme\(([\w.]+)\)/g,
    replacement: (match, p1) => {
      const parts = p1.split(".");
      if (parts[0] === "colors") {
        return `var(--color-${parts.slice(1).join("-")})`;
      }
      if (parts[0] === "screens") {
        return `var(--breakpoint-${parts[1]})`;
      }
      return match;
    },
    description: "Update theme() function to use CSS variables",
  },
  // Linear gradient updates
  {
    pattern: /bg-gradient-/g,
    replacement: "bg-linear-",
    description: "Update gradient utilities to new naming",
  },
  // Font stretch utilities
  {
    pattern: /font-condensed/g,
    replacement: "font-stretch-condensed",
    description: "Update font-condensed to font-stretch-condensed",
  },
  {
    pattern: /font-expanded/g,
    replacement: "font-stretch-expanded",
    description: "Update font-expanded to font-stretch-expanded",
  },
];

const DEFAULT_THEME_VARIABLES: TailwindThemeVariable[] = [
  {
    name: "--font-sans",
    value:
      "ui-sans-serif, system-ui, sans-serif, 'Apple Color Emoji', 'Segoe UI Emoji', 'Segoe UI Symbol', 'Noto Color Emoji'",
  },
  {
    name: "--font-serif",
    value: "ui-serif, Georgia, Cambria, 'Times New Roman', Times, serif",
  },
  {
    name: "--font-mono",
    value:
      "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
  { name: "--spacing", value: "0.25rem" },
];

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
  themeContent: string,
): TailwindThemeVariable[] {
  const variables: TailwindThemeVariable[] = [...DEFAULT_THEME_VARIABLES];

  // Extract color definitions
  const colorMatch = /colors:\s*{([^}]*)}/s.exec(themeContent);
  if (colorMatch) {
    const colorContent = colorMatch[1];
    const colorEntries = colorContent.matchAll(/(\w+):\s*['"]([^'"]+)['"]/g);
    for (const [, name, value] of colorEntries) {
      variables.push({
        name: `--color-${name}`,
        value: value.startsWith("#") ? convertHexToOklch(value) : value,
      });
    }
  }

  // Extract spacing definitions
  const spacingMatch = /spacing:\s*{([^}]*)}/s.exec(themeContent);
  if (spacingMatch) {
    variables.push({ name: "--spacing", value: "0.25rem" });
  }

  // Extract breakpoint definitions
  const screenMatch = /screens:\s*{([^}]*)}/s.exec(themeContent);
  if (screenMatch) {
    const screenContent = screenMatch[1];
    const screenEntries = screenContent.matchAll(/(\w+):\s*['"]([^'"]+)['"]/g);
    for (const [, name, value] of screenEntries) {
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
    const deps = pkg.dependencies || {};
    const devDeps = pkg.devDependencies || {};

    // Remove old dependencies
    delete deps.tailwindcss;
    delete deps["postcss-import"];
    delete deps.autoprefixer;
    delete devDeps.tailwindcss;
    delete devDeps["postcss-import"];
    delete devDeps.autoprefixer;

    // Add new dependencies
    devDeps.tailwindcss = "next";
    devDeps["@tailwindcss/postcss"] = "next";

    // Add Vite plugin if using Vite
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

      for (const {
        pattern,
        replacement,
        description,
      } of TAILWIND_REPLACEMENTS) {
        const originalContent = content;
        content = content.replace(pattern, (...args) =>
          typeof replacement === "string" ? replacement : replacement(...args),
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
      `Failed to convert Tailwind CSS: ${error instanceof Error ? error.message : String(error)}`,
    );
    throw error;
  }
}
