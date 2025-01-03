import type { ReliverseConfig } from "~/types.js";

export const DEFAULT_CONFIG: ReliverseConfig = {
  experimental: {
    // Project details
    projectAuthor: "",
    projectState: "",
    projectDomain: "",
    projectType: "",
    projectCategory: "",
    projectSubcategory: "",

    // Development preferences
    projectFramework: "nextjs",
    projectPackageManager: "bun",
    preferredLibraries: {
      stateManagement: "zustand",
      formManagement: "react-hook-form",
      styling: "tailwind",
      uiComponents: "shadcn-ui",
      testing: "bun",
      authentication: "clerk",
      database: "drizzle",
      api: "trpc",
    },

    // Project features
    features: {
      i18n: true,
      analytics: false,
      themeMode: "dark-light",
      authentication: true,
      api: true,
      database: true,
      testing: false,
      docker: false,
      ci: false,
      commands: [],
      webview: [],
      language: [],
      themes: [],
    },

    // Code style preferences
    codeStyle: {
      dontRemoveComments: true,
      shouldAddComments: true,
      typeOrInterface: "type",
      importOrRequire: "import",
      quoteMark: "double",
      semicolons: true,
      lineWidth: 80,
      indentStyle: "space",
      indentSize: 2,
      importSymbol: "~",
      trailingComma: "all",
      bracketSpacing: true,
      arrowParens: "always",
      tabWidth: 2,
    },

    // Generation preferences
    skipPromptsUseAutoBehavior: false,
    deployBehavior: "prompt",
    depsBehavior: "prompt",
    gitBehavior: "prompt",
    i18nBehavior: "prompt",
    scriptsBehavior: "prompt",
  },
};
