import type { ConfigPreset } from "~/types.js";

export const ESLINT_PRESETS: Record<string, ConfigPreset> = {
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
