import { multiselectPrompt, relinka, selectPrompt } from "@reliverse/prompts";

import {
  applyTheme,
  AVAILABLE_COMPONENTS,
  getInstalledComponents,
  installComponent,
  readShadcnConfig,
  removeComponent,
  selectChartsPrompt,
  selectSidebarPrompt,
  THEMES,
  updateComponent,
} from "~/utils/handlers/shadcn.js";

export async function manageShadcn(projectPath: string) {
  const shadcnConfig = await readShadcnConfig(projectPath);
  if (!shadcnConfig) {
    relinka("error", "shadcn/ui configuration file not found");
    return;
  }
  const shadcnAction = await selectPrompt({
    title: "What would you like to do?",
    options: [
      { label: "Add Components", value: "add" },
      { label: "Remove Components", value: "remove" },
      { label: "Update Components", value: "update" },
      { label: "Change Theme", value: "theme" },
      { label: "Install sidebars", value: "sidebars" },
      { label: "Install charts", value: "charts" },
    ],
  });
  switch (shadcnAction) {
    case "sidebars":
      selectSidebarPrompt(projectPath);
      return;
    case "charts":
      selectChartsPrompt(projectPath);
      return;
    case "add": {
      const installedComponents = await getInstalledComponents(
        projectPath,
        shadcnConfig,
      );
      const availableComponents = AVAILABLE_COMPONENTS.filter(
        (c) => !installedComponents.includes(c),
      );
      const components = await multiselectPrompt({
        title: "Select components to add:",
        options: availableComponents.map((c) => ({ label: c, value: c })),
      });
      for (const component of components) {
        await installComponent(projectPath, component);
      }
      return;
    }
    case "remove": {
      const installedComponents = await getInstalledComponents(
        projectPath,
        shadcnConfig,
      );
      const components = await multiselectPrompt({
        title: "Select components to remove:",
        options: installedComponents.map((c) => ({ label: c, value: c })),
      });
      for (const component of components) {
        await removeComponent(projectPath, shadcnConfig, component);
      }
      return;
    }
    case "update": {
      const installedComponents = await getInstalledComponents(
        projectPath,
        shadcnConfig,
      );
      const components = await multiselectPrompt({
        title: "Select components to update:",
        options: installedComponents.map((c) => ({ label: c, value: c })),
      });
      for (const component of components) {
        await updateComponent(projectPath, component);
      }
      return;
    }
    case "theme": {
      const theme = await selectPrompt({
        title: "Select a theme:",
        options: THEMES.map((t) => ({ label: t.name, value: t.name })),
      });
      const selectedTheme = THEMES.find((t) => t.name === theme);
      if (selectedTheme) {
        await applyTheme(projectPath, shadcnConfig, selectedTheme);
      }
      return;
    }
  }
}
