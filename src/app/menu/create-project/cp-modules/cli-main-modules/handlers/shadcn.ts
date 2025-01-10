import { execa } from "execa";
import fs from "fs-extra";
import path from "pathe";

import type { ShadcnConfig, Theme } from "~/types.js";

import { pmx } from "~/app/menu/create-project/cp-modules/cli-main-modules/detections/detectPackageManager.js";
import { relinka } from "~/utils/loggerRelinka.js";

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
  toast: ["toast", "button"],
  combobox: ["popover", "command"],
  command: ["dialog"],
  "date-picker": ["button", "calendar", "popover"],
  "input-otp": ["input"],
  resizable: ["separator"],
  sonner: [],
  "toggle-group": ["toggle"],
};

const THEMES: Theme[] = [
  {
    name: "Default",
    colors: {
      "--background": "0 0% 100%",
      "--foreground": "240 10% 3.9%",
      "--card": "0 0% 100%",
      "--card-foreground": "240 3% 6%",
      "--card-two": "240 10% 3.9%",
      "--card-two-foreground": "0 0% 98%",
      "--popover": "0 0% 100%",
      "--popover-foreground": "240 10% 3.9%",
      "--primary": "240 5.9% 10%",
      "--primary-foreground": "0 0% 98%",
      "--secondary": "240 4.8% 95.9%",
      "--secondary-foreground": "240 5.9% 10%",
      "--muted": "240 4.8% 95.9%",
      "--muted-foreground": "240 3.8% 46.1%",
      "--accent": "240 4.8% 95.9%",
      "--accent-foreground": "240 5.9% 10%",
      "--destructive": "0 84.2% 60.2%",
      "--destructive-foreground": "0 0% 98%",
      "--border": "240 5.9% 90%",
      "--input": "240 5.9% 90%",
      "--ring": "240 10% 3.9%",
      "--chart-1": "12 76% 61%",
      "--chart-2": "173 58% 39%",
      "--chart-3": "197 37% 24%",
      "--chart-4": "43 74% 66%",
      "--chart-5": "27 87% 67%",
      "--radius": "0.5rem",
      "--sidebar-background": "0 0% 98%",
      "--sidebar-foreground": "240 5.3% 26.1%",
      "--sidebar-primary": "240 5.9% 10%",
      "--sidebar-primary-foreground": "0 0% 98%",
      "--sidebar-accent": "240 4.8% 95.9%",
      "--sidebar-accent-foreground": "240 5.9% 10%",
      "--sidebar-border": "220 13% 91%",
      "--sidebar-ring": "217.2 91.2% 59.8%",
    },
  },
  {
    name: "Dark",
    colors: {
      "--background": "240 10% 3.9%",
      "--foreground": "0 0% 98%",
      "--card": "240 10% 3.9%",
      "--card-foreground": "0 0% 98%",
      "--card-two": "240 3% 6%",
      "--card-two-foreground": "0 0% 98%",
      "--popover": "240 10% 3.9%",
      "--popover-foreground": "0 0% 98%",
      "--primary": "0 0% 98%",
      "--primary-foreground": "240 5.9% 10%",
      "--secondary": "240 3.7% 15.9%",
      "--secondary-foreground": "0 0% 98%",
      "--muted": "240 3.7% 15.9%",
      "--muted-foreground": "240 5% 64.9%",
      "--accent": "240 3.7% 15.9%",
      "--accent-foreground": "0 0% 98%",
      "--destructive": "0 62.8% 30.6%",
      "--destructive-foreground": "0 0% 98%",
      "--border": "240 3.7% 15.9%",
      "--input": "240 3.7% 15.9%",
      "--ring": "240 4.9% 83.9%",
      "--chart-1": "220 70% 50%",
      "--chart-2": "160 60% 45%",
      "--chart-3": "30 80% 55%",
      "--chart-4": "280 65% 60%",
      "--chart-5": "340 75% 55%",
      "--radius": "0.5rem",
      "--sidebar-background": "240 5.9% 10%",
      "--sidebar-foreground": "240 4.8% 95.9%",
      "--sidebar-primary": "224.3 76.3% 48%",
      "--sidebar-primary-foreground": "0 0% 100%",
      "--sidebar-accent": "240 3.7% 15.9%",
      "--sidebar-accent-foreground": "240 4.8% 95.9%",
      "--sidebar-border": "240 3.7% 15.9%",
      "--sidebar-ring": "217.2 91.2% 59.8%",
    },
  },
];

export async function readShadcnConfig(
  cwd: string,
): Promise<ShadcnConfig | null> {
  const configPath = path.join(cwd, "components.json");
  try {
    if (await fs.pathExists(configPath)) {
      return (await fs.readJson(configPath)) as ShadcnConfig;
    }
  } catch (error) {
    relinka(
      "error",
      "Error reading shadcn config:",
      error instanceof Error ? error.message : String(error),
    );
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
    relinka(
      "error",
      "Error reading UI components:",
      error instanceof Error ? error.message : String(error),
    );
  }
  return [];
}

async function ensureComponentDependencies(
  cwd: string,
  component: string,
  config: ShadcnConfig,
): Promise<void> {
  const dependencies = COMPONENT_DEPENDENCIES[component] ?? [];
  const installedComponents = await getInstalledComponents(cwd, config);

  for (const dep of dependencies) {
    if (!installedComponents.includes(dep)) {
      relinka("info", `Installing required dependency: ${dep}`);
      await installComponent(cwd, dep);
    }
  }
}

type InitOptions = {
  defaults?: boolean;
  force?: boolean;
  yes?: boolean;
  cwd: string;
};

type ComponentOptions = {
  yes?: boolean;
  overwrite?: boolean;
  cwd: string;
  all?: boolean;
  path?: string;
};

export async function initializeShadcn(
  cwd: string,
  options: Partial<InitOptions> = {},
): Promise<void> {
  try {
    const configExists = await fs.pathExists(path.join(cwd, "components.json"));
    if (configExists && !options.force) {
      relinka("info", "shadcn/ui is already initialized");
      return;
    }

    const args = ["shadcn-ui@latest", "init"];

    if (options.defaults) {
      args.push("--defaults");
    }
    if (options.force) {
      args.push("--force");
    }
    if (options.yes) {
      args.push("--yes");
    }

    await execa(pmx, args, {
      cwd,
      stdio: "inherit",
    });

    relinka("success", "Initialized shadcn/ui");
  } catch (error) {
    relinka(
      "error",
      "Failed to initialize shadcn/ui:",
      error instanceof Error ? error.message : String(error),
    );
  }
}

export async function installComponent(
  cwd: string,
  component: string,
  options: Partial<ComponentOptions> = {},
): Promise<void> {
  try {
    const config = await readShadcnConfig(cwd);
    if (!config) {
      relinka("error", "shadcn/ui configuration not found");
      return;
    }

    await ensureComponentDependencies(cwd, component, config);

    const args = ["shadcn-ui@latest", "add", component];

    if (options.yes) {
      args.push("--yes");
    }
    if (options.overwrite) {
      args.push("--overwrite");
    }
    if (options.all) {
      args.push("--all");
    }
    if (options.path) {
      args.push("--path");
      args.push(options.path);
    }

    await execa(pmx, args, { cwd });

    relinka("success", `Installed component: ${component}`);
  } catch (error) {
    relinka(
      "error",
      `Failed to install ${component}:`,
      error instanceof Error ? error.message : String(error),
    );
  }
}

export async function updateComponent(
  cwd: string,
  component: string,
): Promise<void> {
  return installComponent(cwd, component, { overwrite: true });
}

export async function installAllComponents(
  cwd: string,
  options: Partial<ComponentOptions> = {},
): Promise<void> {
  try {
    const config = await readShadcnConfig(cwd);
    if (!config) {
      relinka("error", "shadcn/ui configuration not found");
      return;
    }

    await installComponent(cwd, "", { ...options, all: true });
    relinka("success", "Installed all components");
  } catch (error) {
    relinka(
      "error",
      "Failed to install all components:",
      error instanceof Error ? error.message : String(error),
    );
  }
}

export async function removeComponent(
  cwd: string,
  config: ShadcnConfig,
  component: string,
): Promise<void> {
  try {
    const dependentComponents = Object.entries(COMPONENT_DEPENDENCIES)
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
    relinka(
      "error",
      `Failed to remove ${component}:`,
      error instanceof Error ? error.message : String(error),
    );
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

    await fs.writeFile(`${cssPath}.backup`, cssContent);

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
    relinka(
      "error",
      `Failed to apply theme ${theme.name}:`,
      error instanceof Error ? error.message : String(error),
    );
    try {
      if (await fs.pathExists(`${cssPath}.backup`)) {
        await fs.copy(`${cssPath}.backup`, cssPath);
        relinka("info", "Restored previous theme from backup");
      }
    } catch (backupError) {
      relinka(
        "error",
        "Failed to restore theme backup:",
        backupError instanceof Error
          ? backupError.message
          : String(backupError),
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
  "carousel",
  "charts",
  "checkbox",
  "collapsible",
  "combobox",
  "command",
  "context-menu",
  "data-table",
  "date-picker",
  "dialog",
  "drawer",
  "dropdown-menu",
  "form",
  "hover-card",
  "input",
  "input-otp",
  "label",
  "menubar",
  "navigation-menu",
  "pagination",
  "popover",
  "progress",
  "radio-group",
  "resizable",
  "scroll-area",
  "select",
  "separator",
  "sheet",
  "sidebar",
  "skeleton",
  "slider",
  "sonner",
  "switch",
  "table",
  "tabs",
  "textarea",
  "toast",
  "toggle",
  "toggle-group",
  "tooltip",
];

export { THEMES };

export function selectSidebarPrompt(projectPath: string): void {
  relinka(
    "info-verbose",
    "The following project requested sidebar installation",
    projectPath,
  );
  relinka("info-verbose", "Coming soon...");
}

export function selectChartsPrompt(projectPath: string): void {
  relinka(
    "info-verbose",
    "The following project requested charts installation",
    projectPath,
  );
  relinka("info-verbose", "Coming soon...");
}
