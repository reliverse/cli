/// <reference types="./types.d.ts" />

import eslint from "@eslint/js";
import importPlugin from "eslint-plugin-import";
// @ts-expect-error missing types
import perfectionistNatural from "eslint-plugin-perfectionist/configs/recommended-natural";
import tseslint from "typescript-eslint";

export default tseslint.config(
	{
		// Globally ignored files
		ignores: ["**/*.config.js"],
	},
	{
		files: ["**/*.js", "**/*.ts", "**/*.tsx"],
		plugins: {
			import: importPlugin,
		},
		extends: [
			eslint.configs.recommended,
			...tseslint.configs.recommended,
			...tseslint.configs.recommendedTypeChecked,
			...tseslint.configs.stylisticTypeChecked,
			perfectionistNatural,
		],
		rules: {
			"@typescript-eslint/no-unused-vars": [
				"error",
				{ argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
			],
			"@typescript-eslint/consistent-type-imports": [
				"warn",
				{ prefer: "type-imports", fixStyle: "separate-type-imports" },
			],
			"@typescript-eslint/no-misused-promises": [
				2,
				{ checksVoidReturn: { attributes: false } },
			],
			"@typescript-eslint/no-unnecessary-condition": [
				"error",
				{ allowConstantLoopConditions: true },
			],
			"@typescript-eslint/no-non-null-assertion": "error",
			"import/consistent-type-specifier-style": ["error", "prefer-top-level"],
		},
	},
	{
		linterOptions: { reportUnusedDisableDirectives: true },
		languageOptions: { parserOptions: { project: true } },
	},
);

/**
 * Blefnk's ESLint Configuration for Reliverse
 * ===========================================
 *
 * Maybe you'll need to run `>ESLint: Restart ESLint`
 * command after making changes and the file saving.
 * Tip: Open `>Keyboard Shortcuts` and bind restart.
 *
 * When using ESLint VSCode extension, make sure you
 * have `Use Flat Config` option enabled in settings.
 * Bonus tip: When using Relivator, use `pnpm appts`.
 *
 * Note: antfu already includes the following plugins:
 * typescript, stylistic, perfectionist, jsonc, react,
 * unicorn, unocss, vue, yaml, toml, jsdoc, markdown.
 * Go to `export default antfu` to see actual config.
 *
 * @see https://github.com/antfu/eslint-config#antfueslint-config
 * @see https://github.com/blefnk/relivator#readme <== get config updates
 * @see https://eslint.org/docs/latest/use/configure/configuration-files-new
 */
