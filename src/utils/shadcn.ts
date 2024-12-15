import { execa } from "execa";
import fs from "fs-extra";
import path from "pathe";

import { relinka } from "./console.js";

type ShadcnConfig = {
  style: string;
  rsc: boolean;
  tsx: boolean;
  tailwind: {
    config: string;
    css: string;
    baseColor: string;
    cssVariables: boolean;
    prefix: string;
  };
  aliases: {
    components: string;
    utils: string;
    ui: string;
    lib: string;
    hooks: string;
  };
  iconLibrary: string;
};

type Theme = {
  name: string;
  colors: Record<string, string>;
};

const COMPONENT_DEPENDENCIES: Record<string, string[]> = {
  "alert-dialog": ["button"],
  "context-menu": ["button"],
  "dropdown-menu": ["button"],
  form: ["button", "label", "input"],
  "hover-card": ["button"],
  menubar: ["button"],
  "navigation-menu": ["button"],
  popover: ["button"],
  sheet: ["button"],
  toast: ["button"],
};

const THEMES: Theme[] = [
  {
    name: "Default",
    colors: {
      "--background": "0 0% 100%",
      "--foreground": "240 10% 3.9%",
      "--muted": "240 4.8% 95.9%",
      "--muted-foreground": "240 3.8% 46.1%",
      "--popover": "0 0% 100%",
      "--popover-foreground": "240 10% 3.9%",
      "--card": "0 0% 100%",
      "--card-foreground": "240 10% 3.9%",
      "--border": "240 5.9% 90%",
      "--input": "240 5.9% 90%",
      "--primary": "240 5.9% 10%",
      "--primary-foreground": "0 0% 98%",
      "--secondary": "240 4.8% 95.9%",
      "--secondary-foreground": "240 5.9% 10%",
      "--accent": "240 4.8% 95.9%",
      "--accent-foreground": "240 5.9% 10%",
      "--destructive": "0 84.2% 60.2%",
      "--destructive-foreground": "0 0% 98%",
      "--ring": "240 5.9% 10%",
      "--radius": "0.5rem",
    },
  },
  {
    name: "Dark",
    colors: {
      "--background": "240 10% 3.9%",
      "--foreground": "0 0% 98%",
      // ... (dark theme colors)
    },
  },
  {
    name: "Slate",
    colors: {
      "--background": "0 0% 98%",
      "--foreground": "224 71.4% 4.1%",
      "--primary": "220.9 39.3% 11%",
      "--primary-foreground": "210 20% 98%",
    },
  },
  {
    name: "Rose",
    colors: {
      "--background": "0 0% 98%",
      "--foreground": "240 10% 3.9%",
      "--primary": "346.8 77.2% 49.8%",
      "--primary-foreground": "355.7 100% 97.3%",
    },
  },
];

export async function readShadcnConfig(
  cwd: string,
): Promise<ShadcnConfig | null> {
  const configPath = path.join(cwd, "components.json");
  try {
    if (await fs.pathExists(configPath)) {
      return await fs.readJson(configPath);
    }
  } catch (error) {
    relinka("error", "Error reading shadcn config:", error.toString());
  }
  return null;
}

export async function getInstalledComponents(
  cwd: string,
  config: ShadcnConfig,
): Promise<string[]> {
  const uiPath = path.join(cwd, config.aliases.ui.replace("~", "src"));
  try {
    if (await fs.pathExists(uiPath)) {
      const files = await fs.readdir(uiPath);
      return files
        .filter((f) => f.endsWith(".tsx"))
        .map((f) => f.replace(".tsx", ""));
    }
  } catch (error) {
    relinka("error", "Error reading UI components:", error.toString());
  }
  return [];
}

async function checkShadcnDependencies(cwd: string): Promise<boolean> {
  try {
    const pkgJson = await fs.readJson(path.join(cwd, "package.json"));
    const requiredDeps = [
      "tailwindcss",
      "class-variance-authority",
      "clsx",
      "tailwind-merge",
    ];

    const missingDeps = requiredDeps.filter(
      (dep) => !pkgJson.dependencies?.[dep] && !pkgJson.devDependencies?.[dep],
    );

    if (missingDeps.length > 0) {
      relinka(
        "error",
        "Missing required dependencies:",
        missingDeps.join(", "),
      );
      return false;
    }

    return true;
  } catch (error) {
    relinka("error", "Error checking dependencies:", error.toString());
    return false;
  }
}

async function ensureComponentDependencies(
  cwd: string,
  component: string,
  config: ShadcnConfig,
): Promise<void> {
  const dependencies = COMPONENT_DEPENDENCIES[component] || [];
  const installedComponents = await getInstalledComponents(cwd, config);

  for (const dep of dependencies) {
    if (!installedComponents.includes(dep)) {
      relinka("info", `Installing required dependency: ${dep}`);
      await installComponent(cwd, dep);
    }
  }
}

export async function installComponent(
  cwd: string,
  component: string,
): Promise<void> {
  try {
    if (!(await checkShadcnDependencies(cwd))) {
      relinka("error", "Please install required dependencies first");
      return;
    }

    const config = await readShadcnConfig(cwd);
    if (!config) {
      relinka("error", "shadcn/ui configuration not found");
      return;
    }

    await ensureComponentDependencies(cwd, component, config);
    await execa("npx", ["shadcn-ui@latest", "add", component], { cwd });
    relinka("success", `Installed component: ${component}`);
  } catch (error) {
    relinka("error", `Failed to install ${component}:`, error.toString());
  }
}

export async function removeComponent(
  cwd: string,
  config: ShadcnConfig,
  component: string,
): Promise<void> {
  try {
    // Check if any other components depend on this one
    const dependentComponents = Object.entries(COMPONENT_DEPENDENCIES)
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      .filter(([_, deps]) => deps.includes(component))
      .map(([comp]) => comp);

    const installedComponents = await getInstalledComponents(cwd, config);
    const installedDependents = dependentComponents.filter((comp) =>
      installedComponents.includes(comp),
    );

    if (installedDependents.length > 0) {
      relinka(
        "error",
        `Cannot remove ${component} as it is required by: ${installedDependents.join(", ")}`,
      );
      return;
    }

    const componentPath = path.join(
      cwd,
      config.aliases.ui.replace("~", "src"),
      `${component}.tsx`,
    );
    await fs.remove(componentPath);
    relinka("success", `Removed component: ${component}`);
  } catch (error) {
    relinka("error", `Failed to remove ${component}:`, error.toString());
  }
}

export async function updateComponent(
  cwd: string,
  component: string,
): Promise<void> {
  try {
    if (!(await checkShadcnDependencies(cwd))) {
      relinka("error", "Please install required dependencies first");
      return;
    }

    await execa("npx", ["shadcn-ui@latest", "add", component, "--overwrite"], {
      cwd,
    });
    relinka("success", `Updated component: ${component}`);
  } catch (error) {
    relinka("error", `Failed to update ${component}:`, error.toString());
  }
}

export async function applyTheme(
  cwd: string,
  config: ShadcnConfig,
  theme: Theme,
): Promise<void> {
  const cssPath = path.join(cwd, config.tailwind.css.replace("~", "src"));
  try {
    let cssContent = await fs.readFile(cssPath, "utf-8");

    // Backup existing file
    await fs.writeFile(`${cssPath}.backup`, cssContent);

    // Find and replace the :root section
    const rootRegex = /:root\s*{[^}]*}/;
    const newRootSection = `:root {
${Object.entries(theme.colors)
  .map(([key, value]) => `    ${key}: ${value};`)
  .join("\n")}
  }`;

    cssContent = cssContent.replace(rootRegex, newRootSection);

    await fs.writeFile(cssPath, cssContent);
    relinka(
      "success",
      `Applied theme: ${theme.name} (backup created at ${cssPath}.backup)`,
    );
  } catch (error) {
    relinka("error", `Failed to apply theme ${theme.name}:`, error.toString());
    // Try to restore backup if it exists
    try {
      if (await fs.pathExists(`${cssPath}.backup`)) {
        await fs.copy(`${cssPath}.backup`, cssPath);
        relinka("info", "Restored previous theme from backup");
      }
    } catch (backupError) {
      relinka(
        "error",
        "Failed to restore theme backup:",
        backupError.toString(),
      );
    }
  }
}

export const AVAILABLE_COMPONENTS = [
  "accordion",
  "alert-dialog",
  "alert",
  "aspect-ratio",
  "avatar",
  "badge",
  "button",
  "calendar",
  "card",
  "checkbox",
  "collapsible",
  "command",
  "context-menu",
  "dialog",
  "dropdown-menu",
  "form",
  "hover-card",
  "input",
  "label",
  "menubar",
  "navigation-menu",
  "popover",
  "progress",
  "radio-group",
  "scroll-area",
  "select",
  "separator",
  "sheet",
  "skeleton",
  "slider",
  "switch",
  "table",
  "tabs",
  "textarea",
  "toast",
  "toggle",
  "tooltip",
];

export { THEMES };
