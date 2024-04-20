// @ts-expect-error disabled temporarily
import antfu from "@antfu/eslint-config";
// @ts-expect-error disabled temporarily
import eslintJsPlugin from "@eslint/js";
import baseConfig from "@tools/eslintconfig/base";
import nextjsConfig from "@tools/eslintconfig/nextjs";
import reactConfig from "@tools/eslintconfig/react";
// @ts-expect-error dts missing
import tailwindcssPlugin from "eslint-plugin-tailwindcss";

// /** @type {import('typescript-eslint').Config} */
export default [
	{ ignores: [".next/**", "dist"] },
	...baseConfig,
	...reactConfig,
	...nextjsConfig,
];

// TODO: Implement @antfu legacy config support
// import { FlatCompat } from "@eslint/eslintrc";
// TODO: LEGACY CONFIG
// const compat = new FlatCompat();
// TODO: CURRENTLY UNSTABLE
/* export default antfu(
	{
		// GENERAL FLAT CONFIG
		ignores: [".next/**"],
		typescript: { tsconfigPath: "tsconfig.json" },
		stylistic: { quotes: "double", semi: true, indent: "tab" },
		settings: {
			react: { version: "detect" },
		},
		plugins: {
			tailwindcss: tailwindcssPlugin,
		},
		rules: {
			...eslintJsPlugin.configs.recommended.rules,
			...tailwindcssPlugin.configs.recommended.rules,
		},
	},
	// TODO: LEGACY CONFIG
	// ...compat.config({
	// 	extends: [
	// 		"eslint:recommended",
	// 	],
	// }),
	// OTHER FLAT CONFIGS
); */
